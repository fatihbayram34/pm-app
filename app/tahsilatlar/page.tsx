"use client";

import React, { useEffect, useState } from "react";
import { subscribeReceipts, Receipt, addReceipt } from "@/lib/db/receipts";
import { subscribeCustomers, Customer } from "@/lib/db/customers";
import { subscribeProjects, Project } from "@/lib/db/projects";
import { Money } from "@/components/Money";
import { ReceiptForm } from "@/components/ReceiptForm";
import dayjs from "@/lib/date";
import { useToast } from "@/components/ToastProvider";

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const unsubRec = subscribeReceipts((data) => setReceipts(data));
    const unsubCust = subscribeCustomers((data) => setCustomers(data));
    const unsubProj = subscribeProjects((data) => setProjects(data));
    return () => {
      unsubRec();
      unsubCust();
      unsubProj();
    };
  }, []);

  // ReceiptForm beklenen sade tipler:
  // customers: { id: string; unvan: string }[]
  // projects : { id: string; ad: string; musteri_id: string }[]
  const customersLite = customers
    .filter((c) => !!c.id)
    .map((c) => ({ id: c.id!, unvan: c.unvan }));

  const projectsLite = projects
    .filter((p) => !!p.id)
    .map((p) => ({ id: p.id!, ad: p.ad, musteri_id: p.musteri_id }));

  const handleSubmit = async (data: any) => {
    try {
      await addReceipt(data);
      showToast("Tahsilat eklendi", "success");
      setShowModal(false);
    } catch (err) {
      showToast("Tahsilat eklenemedi", "error");
    }
  };

  const toJSDate = (t: any) => (t?.toDate ? t.toDate() : t);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tahsilatlar</h2>
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm"
        >
          Yeni Tahsilat
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white dark:bg-gray-800 shadow">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-200 dark:bg-gray-700">
              <th className="px-3 py-2 text-left">Tarih</th>
              <th className="px-3 py-2 text-left">Müşteri</th>
              <th className="px-3 py-2 text-right">Tutar (Brüt)</th>
              <th className="px-3 py-2 text-left">Yöntem</th>
              <th className="px-3 py-2 text-left">Açıklama</th>
            </tr>
          </thead>
          <tbody>
            {receipts
              .slice()
              .sort((a, b) => {
                const da = dayjs(toJSDate(a.tarih));
                const db = dayjs(toJSDate(b.tarih));
                return db.valueOf() - da.valueOf();
              })
              .map((r) => (
                <tr key={r.id} className="border-b dark:border-gray-700">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {dayjs(toJSDate(r.tarih)).format("DD.MM.YYYY")}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {customers.find((c) => c.id === r.musteri_id)?.unvan ??
                      r.musteri_id}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    <Money value={r.tutar_brut} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.yontem}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.aciklama}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Add Receipt Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-11/12 max-w-lg">
            <h3 className="text-lg font-medium mb-4">Yeni Tahsilat</h3>
            <ReceiptForm
              customers={customersLite}
              projects={projectsLite}
              onSubmit={handleSubmit}
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-2 bg-gray-200 rounded-xl text-sm"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}