"use client";

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LedgerSchema } from '@/lib/db/ledger';
import { z } from 'zod';

// Form tipi LedgerSchema'dan türetilir
type StockFormValues = z.infer<typeof LedgerSchema>;

interface Props {
  catalog: { id: string; kod: string; ad: string; birim: string }[];
  customers: { id: string; unvan: string }[];
  projects: { id: string; ad: string; musteri_id: string }[];
  onSubmit: (data: StockFormValues) => void;
}

/**
 * Çok satırlı stok belgesi formu. react-hook-form kullanarak stok hareketlerini girmenizi sağlar.
 */
export const StockDocForm: React.FC<Props> = ({ catalog, customers, projects, onSubmit }) => {
  const form = useForm<StockFormValues>({
    resolver: zodResolver(LedgerSchema),
    defaultValues: {
      tarih: new Date(),
      tip: 'giris',
      konum: 'depo',
      owner_musteri_id: customers[0]?.id ?? '',
      proje_id: undefined,
      satirlar: [
        {
          katalog_id: catalog[0]?.id ?? '',
          miktar: 0,
          birim: catalog[0]?.birim as any,
        },
      ],
      aciklama: '',
    } as any,
  });

  const { register, control, handleSubmit, watch, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'satirlar' });

  // When catalog item changes, update its unit automatically
  const handleCatalogChange = (index: number, katalog_id: string) => {
    const item = catalog.find((c) => c.id === katalog_id);
    if (item) {
      setValue(`satirlar.${index}.birim`, item.birim as any);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Tarih</label>
        <input type="datetime-local" {...register('tarih' as const)} className="border rounded-lg p-2" />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Tip</label>
        <select {...register('tip' as const)} className="border rounded-lg p-2">
          <option value="giris">Giriş</option>
          <option value="cikis">Çıkış</option>
          <option value="iade">İade</option>
          <option value="transfer">Transfer</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Konum</label>
        <select {...register('konum' as const)} className="border rounded-lg p-2">
          <option value="depo">Depo</option>
          <option value="santiye">Şantiye</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Sahip (Müşteri)</label>
        <select {...register('owner_musteri_id' as const)} className="border rounded-lg p-2">
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.unvan}
            </option>
          ))}
        </select>
      </div>
      {/* Proje alanı isteğe bağlı; çıkış veya iade durumunda gerekli olabilir */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Proje (opsiyonel)</label>
        <select {...register('proje_id' as const)} className="border rounded-lg p-2">
          <option value="">—</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.ad}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Satırlar</label>
        {fields.map((field, index) => (
          <div key={field.id} className="flex flex-col gap-2 border p-2 rounded-xl">
            <div className="flex gap-2">
              <select
                {...register(`satirlar.${index}.katalog_id` as const)}
                className="border rounded-lg p-2 flex-1"
                onChange={(e) => handleCatalogChange(index, e.target.value)}
              >
                {catalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.kod} – {item.ad}
                  </option>
                ))}
              </select>
              <input
                type="number"
                {...register(`satirlar.${index}.miktar` as const, { valueAsNumber: true })}
                className="border rounded-lg p-2 w-24"
                placeholder="Miktar"
              />
              <input
                type="text"
                {...register(`satirlar.${index}.birim` as const)}
                className="border rounded-lg p-2 w-24"
                disabled
              />
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-red-600 px-2"
                aria-label="Satırı sil"
              >
                Sil
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => append({ katalog_id: catalog[0]?.id ?? '', miktar: 0, birim: catalog[0]?.birim as any })}
          className="mt-2 px-3 py-2 rounded-xl bg-gray-200 text-sm"
        >
          Satır Ekle
        </button>
      </div>
      <div className="flex justify-end">
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl">
          Kaydet
        </button>
      </div>
    </form>
  );
};