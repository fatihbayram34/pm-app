'use client';

import React, { useEffect, useState } from 'react';
import { subscribeCatalog, CatalogItem } from '@/lib/db/catalog';
import { subscribeLedger, LedgerDoc } from '@/lib/db/ledger';
import { inventoryBalances } from '@/lib/agg';

export default function CatalogPage() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [ledger, setLedger] = useState<LedgerDoc[]>([]);

  useEffect(() => {
    const unsubs = [subscribeCatalog(setCatalog), subscribeLedger(setLedger)];
    return () => unsubs.forEach((u) => u && (u as any)());
  }, []);

  // Konsolide toplam stok (katalog_id bazında)
  // ledger satırlarını dolaşarak miktar topluyoruz: giriş +, çıkış -, iade +.
  const totalStock: Record<string, number> = (ledger ?? []).reduce((acc, doc) => {
    let sign = 0;
    if (doc.tip === 'giris') sign = 1;
    else if (doc.tip === 'cikis') sign = -1;
    else if (doc.tip === 'iade') sign = 1; // depoya iade stok artırır

    if (sign !== 0) {
      for (const row of (doc.satirlar ?? [])) {
        const catId = row.katalog_id;
        const qty = row.miktar ?? 0;
        acc[catId] = (acc[catId] ?? 0) + sign * qty;
      }
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Katalog</h2>

      <div className="rounded-2xl p-4 bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2">Kod</th>
                <th className="py-2">Ad</th>
                <th className="py-2">Birim</th>
                <th className="py-2">Toplam Stok</th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="py-2">{c.kod}</td>
                  <td className="py-2">{c.ad}</td>
                  <td className="py-2">{c.birim}</td>
                  <td className="py-2">{totalStock[c.id!] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
