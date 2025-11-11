"use client";

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ReceiptSchema, ReceiptMethodEnum, ReceiptAllocationSchema } from '@/lib/db/receipts';
import { z } from 'zod';

type ReceiptFormValues = z.infer<typeof ReceiptSchema>;

interface Props {
  customers: { id: string; unvan: string }[];
  projects: { id: string; ad: string; musteri_id: string }[];
  onSubmit: (data: ReceiptFormValues) => void;
}

/**
 * Tahsilat ekleme formu. İsteğe bağlı proje dağılımını destekler.
 */
export const ReceiptForm: React.FC<Props> = ({ customers, projects, onSubmit }) => {
  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(ReceiptSchema),
    defaultValues: {
      musteri_id: customers[0]?.id ?? '',
      tarih: new Date(),
      tutar_brut: 0,
      yontem: 'Havale/EFT',
      aciklama: '',
      allocations: [],
    } as any,
  });

  const { register, control, handleSubmit, watch, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'allocations' });

  const selectedCustomer = watch('musteri_id');
  // Filter projects by selected customer
  const customerProjects = projects.filter((p) => p.musteri_id === selectedCustomer);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Müşteri</label>
        <select {...register('musteri_id')} className="border rounded-lg p-2">
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.unvan}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Tutar (Brüt)</label>
        <input type="number" step="0.01" {...register('tutar_brut', { valueAsNumber: true })} className="border rounded-lg p-2" />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Tarih</label>
        <input type="datetime-local" {...register('tarih')} className="border rounded-lg p-2" />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Yöntem</label>
        <select {...register('yontem')} className="border rounded-lg p-2">
          {ReceiptMethodEnum.options.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Açıklama</label>
        <textarea {...register('aciklama')} className="border rounded-lg p-2" rows={3} />
      </div>
      {/* Proje dağılımı - isteğe bağlı */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Proje Dağılımı (opsiyonel)</label>
          <button
            type="button"
            onClick={() => append({ proje_id: customerProjects[0]?.id ?? '', tutar_brut: 0 })}
            className="text-sm text-blue-600"
          >
            Satır Ekle
          </button>
        </div>
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-center">
            <select
              {...register(`allocations.${index}.proje_id` as const)}
              className="border rounded-lg p-2 flex-1"
            >
              {customerProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ad}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              {...register(`allocations.${index}.tutar_brut` as const, { valueAsNumber: true })}
              className="border rounded-lg p-2 w-32"
              placeholder="Tutar"
            />
            <button
              type="button"
              onClick={() => remove(index)}
              className="text-red-600 px-2"
            >
              Sil
            </button>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl">
          Kaydet
        </button>
      </div>
    </form>
  );
};