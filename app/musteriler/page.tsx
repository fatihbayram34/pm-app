'use client';

import React, { useEffect, useState } from 'react';
import { subscribeCustomers, Customer as DBCustomer } from '@/lib/db/customers';
import { subscribeProjects, Project as DBProject } from '@/lib/db/projects';
import { subscribeReceipts, Receipt } from '@/lib/db/receipts';
import { customerBalanceBrut } from '@/lib/agg';
import { Money } from '@/components/Money';
import { ReceiptForm } from '@/components/ReceiptForm';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<DBCustomer[]>([]);
  const [projects, setProjects] = useState<DBProject[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<DBCustomer | null>(null);

  useEffect(() => {
    const unsubs = [
      subscribeCustomers(setCustomers),
      subscribeProjects(setProjects),
      subscribeReceipts(setReceipts),
    ];
    return () => unsubs.forEach(u => u && (u as any)());
  }, []);

  // 'agg' fonksiyonları id: string beklediği için, opsiyonel id'leri güvenli hale getiriyoruz
  const customersSafe = customers.filter(c => !!c.id).map(c => ({ ...c, id: c.id! }));
  const projectsSafe  = projects.filter(p => !!p.id).map(p => ({ ...p, id: p.id! }));

  // Cari bakiyeler (brüt) hesapla
  const balances = customerBalanceBrut(customersSafe as any, projectsSafe as any, receipts);

  const handleAddReceipt = (cust: DBCustomer) => {
    setSelectedCustomer(cust);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Müşteriler</h2>

      <div className="rounded-2xl p-4 bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2">Unvan</th>
                <th className="py-2">Toplam Anlaşma (Brüt)</th>
                <th className="py-2">Toplam Tahsilat (Brüt)</th>
                <th className="py-2">Bakiye (Brüt)</th>
                <th className="py-2">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((c: any) => (
                <tr key={c.id} className="border-t">
                  <td className="py-2">{c.unvan}</td>
                  <td className="py-2"><Money value={c.toplam_anlasma_brut ?? 0} /></td>
                  <td className="py-2"><Money value={c.toplam_tahsilat_brut ?? 0} /></td>
                  <td className="py-2">
                    <span className={
                      (c.bakiye_brut ?? 0) >= 0 ? 'bg-amber-100 text-amber-800 px-2 py-1 rounded-full' :
                      'bg-green-100 text-green-800 px-2 py-1 rounded-full'
                    }>
                      <Money value={c.bakiye_brut ?? 0} />
                    </span>
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => handleAddReceipt(c)}
                      className="px-3 py-1 rounded-xl bg-black text-white"
                    >
                      Tahsilat Ekle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCustomer?.id && (
        <div className="rounded-2xl p-4 bg-white shadow">
          <h3 className="font-semibold mb-2">{selectedCustomer.unvan} – Tahsilat</h3>
          <ReceiptForm
            customers={[{ id: selectedCustomer.id, unvan: selectedCustomer.unvan }]}
            projects={projectsSafe}          />
        </div>
      )}
    </div>
  );
}
