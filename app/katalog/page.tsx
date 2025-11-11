"use client";

import React, { useEffect, useState } from 'react';
import { subscribeCatalog, CatalogItem, addCatalogItem } from '@/lib/db/catalog';
import { subscribeLedger } from '@/lib/db/ledger';
import { inventoryBalances } from '@/lib/agg';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CatalogSchema } from '@/lib/db/catalog';
import { Money } from '@/components/Money';
import { useToast } from '@/components/ToastProvider';

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const { showToast } = useToast();
  const form = useForm<any>({ resolver: zodResolver(CatalogSchema as any), defaultValues: { kod: '', ad: '', birim: 'Adet' } });

  useEffect(() => {
    const unsubCat = subscribeCatalog((data) => setItems(data));
    const unsubLed = subscribeLedger((data) => setLedger(data));
    return () => {
      unsubCat();
      unsubLed();
    };
  }, []);

  const handleAdd = form.handleSubmit(async (values) => {
    try {
      await addCatalogItem(values);
      showToast('Katalog ürünü eklendi', 'success');
      form.reset({ kod: '', ad: '', birim: 'Adet' });
    } catch (err) {
      showToast('Katalog eklenemedi', 'error');
    }
  });

  // calculate total stock per item from ledger
  const balances = inventoryBalances(ledger);
  // sum across all owners and locations
  const totalStock: Record<string, number> = {};
  Object.keys(balances).forEach((loc) => {
    const catalogBalances = balances[loc];
    Object.keys(catalogBalances).forEach((catId) => {
      totalStock[catId] = (totalStock[catId] || 0) + catalogBalances[catId];
    });
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Katalog</h2>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow">
        <h3 className="text-lg font-medium mb-2">Yeni Ürün Ekle</h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm">Kod</label>
            <input type="text" {...form.register('kod')} className="border rounded-lg p-2" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm">Ad</label>
            <input type="text" {...form.register('ad')} className="border rounded-lg p-2" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm">Birim</label>
            <select {...form.register('birim')} className="border rounded-lg p-2">
              <option value="Adet">Adet</option>
              <option value="Metre">Metre</option>
              <option value="Kg">Kg</option>
              <option value="Rulo">Rulo</option>
              <option value="Set">Set</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm">
              Ekle
            </button>
          </div>
        </form>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-200 dark:bg-gray-700">
              <th className="px-3 py-2">Kod</th>
              <th className="px-3 py-2">Ad</th>
              <th className="px-3 py-2">Birim</th>
              <th className="px-3 py-2 text-right">Ortalama Maliyet (Net)</th>
              <th className="px-3 py-2 text-right">Toplam Stok</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b dark:border-gray-700">
                <td className="px-3 py-2">{item.kod}</td>
                <td className="px-3 py-2">{item.ad}</td>
                <td className="px-3 py-2">{item.birim}</td>
                <td className="px-3 py-2 text-right">
                  {item.ortalama_maliyet_net !== undefined ? <Money value={item.ortalama_maliyet_net} /> : '—'}
                </td>
                <td className="px-3 py-2 text-right">{totalStock[item.id!] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}