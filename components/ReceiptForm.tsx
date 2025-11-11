"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "@/lib/date";

// ---- Props (lite tipler) ----
type CustomerLite = { id: string; unvan: string };
type ProjectLite = { id: string; ad: string; musteri_id: string };

type Props = {
  customers: CustomerLite[];
  projects: ProjectLite[];
  onSubmit: (data: any) => Promise<void> | void;
};

// ---- Yöntem listesi (string) ----
const RECEIPT_METHODS = [
  "Havale/EFT",
  "Nakit",
  "POS",
  "Çek/Senet",
  "Diğer",
] as const;

// ---- Zod şeması ----
const ReceiptFormSchema = z.object({
  musteri_id: z.string().min(1, "Müşteri zorunlu"),
  tarih: z
    .string()
    .min(1, "Tarih zorunlu")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Geçersiz tarih"),
  tutar_brut: z
    .string()
    .min(1, "Tutar zorunlu")
    .transform((s) => Number(String(s).replace(",", ".").trim()))
    .refine((n) => !Number.isNaN(n) && n > 0, "Geçerli bir tutar girin"),
  yontem: z.enum(RECEIPT_METHODS),
  aciklama: z.string().optional(),
  // opsiyonel proje dağıtımı
  allocations: z
    .array(
      z.object({
        proje_id: z.string().min(1),
        tutar_brut: z
          .string()
          .transform((s) => Number(String(s).replace(",", ".").trim()))
          .refine((n) => !Number.isNaN(n) && n > 0, "Geçerli tutar"),
      })
    )
    .optional(),
});

type FormValues = z.infer<typeof ReceiptFormSchema>;

export function ReceiptForm({ customers, projects, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(ReceiptFormSchema),
    defaultValues: {
      tarih: dayjs().format("YYYY-MM-DD"),
      yontem: "Havale/EFT",
    },
  });

  const allocs = watch("allocations") || [];

  const addAllocRow = () => {
    const next = [...allocs, { proje_id: "", tutar_brut: "" as any }];
    setValue("allocations", next as any, { shouldValidate: true });
  };

  const removeAllocRow = (idx: number) => {
    const next = allocs.slice();
    next.splice(idx, 1);
    setValue("allocations", next as any, { shouldValidate: true });
  };

  const internalSubmit = (values: FormValues) => {
    // Firestore beklenen yapıya dönüştür
    const payload: any = {
      musteri_id: values.musteri_id,
      // tarih'i Date yap (server timestamp yerine client date gönderiyoruz)
      tarih: new Date(values.tarih),
      tutar_brut: values.tutar_brut as unknown as number,
      yontem: values.yontem,
      aciklama: values.aciklama || "",
    };

    if (values.allocations && values.allocations.length > 0) {
      payload.allocations = values.allocations.map((a) => ({
        proje_id: a.proje_id,
        tutar_brut: Number(a.tutar_brut as unknown as number),
      }));
    }

    return onSubmit(payload);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(internalSubmit)}>
      {/* Müşteri */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Müşteri</label>
        <select
          {...register("musteri_id")}
          className="border rounded-lg p-2"
          defaultValue=""
        >
          <option value="" disabled>
            Seçiniz
          </option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.unvan}
            </option>
          ))}
        </select>
        {errors.musteri_id && (
          <span className="text-red-600 text-xs">
            {errors.musteri_id.message}
          </span>
        )}
      </div>

      {/* Tarih */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Tarih</label>
        <input
          type="date"
          {...register("tarih")}
          className="border rounded-lg p-2"
        />
        {errors.tarih && (
          <span className="text-red-600 text-xs">{errors.tarih.message}</span>
        )}
      </div>

      {/* Tutar (Brüt) */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Tutar (Brüt)</label>
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          {...register("tutar_brut")}
          className="border rounded-lg p-2"
          placeholder="0,00"
        />
        {errors.tutar_brut && (
          <span className="text-red-600 text-xs">
            {errors.tutar_brut.message as any}
          </span>
        )}
      </div>

      {/* Yöntem */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Yöntem</label>
        <select {...register("yontem")} className="border rounded-lg p-2">
          {RECEIPT_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {errors.yontem && (
          <span className="text-red-600 text-xs">{errors.yontem.message}</span>
        )}
      </div>

      {/* Açıklama */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Açıklama</label>
        <input
          type="text"
          {...register("aciklama")}
          className="border rounded-lg p-2"
          placeholder="Opsiyonel"
        />
      </div>

      {/* Proje Dağıtımı (opsiyonel) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Proje Dağıtımı (opsiyonel)</label>
          <button
            type="button"
            onClick={addAllocRow}
            className="px-2 py-1 text-sm rounded-lg bg-gray-100"
          >
            Satır Ekle
          </button>
        </div>

        {allocs.length > 0 && (
          <div className="space-y-2">
            {allocs.map((row: any, idx: number) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <div className="col-span-7">
                  <select
                    {...register(`allocations.${idx}.proje_id` as const)}
                    className="border rounded-lg p-2 w-full"
                    defaultValue={row.proje_id || ""}
                  >
                    <option value="" disabled>
                      Proje seçiniz
                    </option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.ad}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-4">
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    {...register(`allocations.${idx}.tutar_brut` as const)}
                    className="border rounded-lg p-2 w-full"
                    placeholder="0,00"
                    defaultValue={row.tutar_brut || ""}
                  />
                </div>
                <div className="col-span-1 flex items-center">
                  <button
                    type="button"
                    onClick={() => removeAllocRow(idx)}
                    className="px-2 py-1 text-sm rounded-lg bg-red-100 text-red-700"
                    aria-label="Satır kaldır"
                  >
                    X
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {(errors.allocations as any)?.message && (
          <span className="text-red-600 text-xs">
            {(errors.allocations as any).message}
          </span>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm disabled:opacity-60"
        >
          {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </form>
  );
}