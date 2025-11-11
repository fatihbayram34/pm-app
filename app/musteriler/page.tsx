"use client";

import React, { useState, useEffect } from 'react';
import { subscribeCustomers, Customer } from '@/lib/db/customers';
import { subscribeProjects, Project } from '@/lib/db/projects';
import { subscribeReceipts, Receipt } from '@/lib/db/receipts';
import { customerBalanceBrut } from '@/lib/agg';
import { Money } from '@/components/Money';
import { ReceiptForm } from '@/components/ReceiptForm';
import { useToast } from '@/components/ToastProvider';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const unsubCust = subscribeCustomers((data) => setCustomers(data));
    const unsubProj = subscribeProjects((data) => setProjects(data));
    const unsubRec = subscribeReceipts((data) => setReceipts(data));
    return () => {
      unsubCust();
      unsubProj();
      unsubRec();
    };
  }, []);

  // Compute balances per customer
  const balances = customerBalanceBrut(customers, projects, receipts);

  const handleAddReceipt = (cust: Customer) => {
    setSelectedCustomer(cust);
    setShowReceiptModal(true);
  };

  const handleReceiptSubmit = async (data: any) => {
    try {
      // call addReceipt; but we need to import inside to avoid server context.
      const { addReceipt } = await import('@/lib/db/receipts');
      await addReceipt(data);
      showToast('Tahsilat kaydedildi', 'success');
      setShowReceiptModal(false);
    } catch (err) {
      showToast('Tahsilat kaydedilemedi', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Müşteriler</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-200 dark:bg-gray-700">
              <th className="px-3 py-2 text-left">Unvan</th>
              <th className="px-3 py-2 text-right">Toplam Anlaşma (Brüt)</th>
              <th className="px-3 py-2 text-right">Toplam Tahsilat (Brüt)</th>
              <th className="px-3 py-2 text-right">Bakiye (Brüt)</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((cust) => {
              const bal = balances[cust.id!] || { toplam_anlasma_brut: 0, toplam_tahsilat_brut: 0, bakiye_brut: 0 };
              const balanceClass = bal.bakiye_brut >= 0 ? 'text-red-600' : 'text-green-600';
              return (
                <tr key={cust.id} className="border-b dark:border-gray-700">
                  <td className="px-3 py-2 whitespace-nowrap">{cust.unvan}</td>
                  <td className="px-3 py-2 text-right"><Money value={bal.toplam_anlasma_brut} /></td>
                  <td className="px-3 py-2 text-right"><Money value={bal.toplam_tahsilat_brut} /></td>
                  <td className={`px-3 py-2 text-right font-medium ${balanceClass}`}>
                    <Money value={bal.bakiye_brut} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleAddReceipt(cust)}
                      className="px-2 py-1 text-sm bg-blue-600 text-white rounded-xl"
                    >
                      Tahsilat Ekle
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Receipt Modal */}
      {showReceiptModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-11/12 max-w-lg">
            <h3 className="text-lg font-medium mb-4">Tahsilat Ekle – {selectedCustomer.unvan}</h3>
            <ReceiptForm
              customers={customers}
              projects={projects}
              onSubmit={(data) => {
                // Override selected customer ID
                data.musteri_id = selectedCustomer.id!;
                handleReceiptSubmit(data);
              }}
            />
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowReceiptModal(false)} className="px-3 py-2 bg-gray-200 rounded-xl text-sm">
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}