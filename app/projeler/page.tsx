"use client";

import React, { useEffect, useState } from 'react';
import { subscribeProjects, Project, addProject } from '@/lib/db/projects';
import { subscribeReceipts } from '@/lib/db/receipts';
import { subscribeExpenses, Expense } from '@/lib/db/expenses';
import { subscribeLabors, Labor } from '@/lib/db/labors';
import { subscribeLedger, LedgerDoc } from '@/lib/db/ledger';
import { projectCostNet } from '@/lib/agg';
import { Money } from '@/components/Money';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProjectSchema } from '@/lib/db/projects';
import { z } from 'zod';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [labors, setLabors] = useState<Labor[]>([]);
  const [ledger, setLedger] = useState<LedgerDoc[]>([]);
  const [showModal, setShowModal] = useState(false);
  const { showToast } = useToast();
  const newProjForm = useForm<z.infer<typeof ProjectSchema>>({
    resolver: zodResolver(ProjectSchema),
    defaultValues: {
      musteri_id: '',
      ad: '',
      durum: 'Teklif',
      anlasma_net: 0,
      kdv_oran: 0.2,
      baslangic: new Date(),
    } as any,
  });

  useEffect(() => {
    const unsubProj = subscribeProjects((data) => setProjects(data));
    const unsubExp = subscribeExpenses((data) => setExpenses(data));
    const unsubLab = subscribeLabors((data) => setLabors(data));
    const unsubLed = subscribeLedger((data) => setLedger(data));
    return () => {
      unsubProj();
      unsubExp();
      unsubLab();
      unsubLed();
    };
  }, []);

  // compute cost and profit per project
  const metrics = projects.map((proj) => {
    const stockOutNet = ledger
      .filter((d) => d.proje_id === proj.id && d.tip === 'cikis')
      .reduce((s, d) => s + d.satirlar.reduce((t, row) => t + (row.toplam_net ?? 0), 0), 0);
const costNet = projectCostNet(
  expenses.filter(e => e.proje_id === p.id),
  labors.filter(l => l.proje_id === p.id),
  stockOutByProject[p.id] ?? 0
);
const profitNet = p.anlasma_net - costNet;
  });

  
  const metricsMap = metrics.reduce((map, m) => {
    map[m.id] = m;
    return map;
  }, {} as any);

  // dummy customers list from receipts for selection; we should subscribe to customers but for skeleton we derive from receipts
  const [customersList, setCustomersList] = useState<{ id: string; unvan: string }[]>([]);
  useEffect(() => {
    // Combine receipts to get customers
    subscribeReceipts((rec) => {
      const custs = rec
        .map((r) => ({ id: r.musteri_id, unvan: r.musteri_id }))
        .reduce((arr, curr) => {
          if (!arr.find((c) => c.id === curr.id)) arr.push(curr);
          return arr;
        }, [] as { id: string; unvan: string }[]);
      setCustomersList(custs);
    });
  }, []);

  const handleNewProject = newProjForm.handleSubmit(async (values) => {
    try {
      await addProject({
        musteri_id: values.musteri_id,
        ad: values.ad,
        durum: values.durum as any,
        anlasma_net: values.anlasma_net,
        kdv_oran: values.kdv_oran,
        baslangic: values.baslangic as any,
        il: values.il,
        ilce: values.ilce,
        konum: values.konum,
        aciklama: values.aciklama,
      });
      showToast('Proje eklendi', 'success');
      setShowModal(false);
      newProjForm.reset();
    } catch (err) {
      showToast('Proje eklenemedi', 'error');
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Projeler</h2>
        <button onClick={() => setShowModal(true)} className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm">
          Yeni Proje
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-200 dark:bg-gray-700">
              <th className="px-3 py-2 text-left">Proje</th>
              <th className="px-3 py-2 text-left">Müşteri</th>
              <th className="px-3 py-2 text-left">Durum</th>
              <th className="px-3 py-2 text-right">Anlaşma Net</th>
              <th className="px-3 py-2 text-right">Anlaşma Brüt</th>
              <th className="px-3 py-2 text-right">Toplam Maliyet (Net)</th>
              <th className="px-3 py-2 text-right">Brüt Kâr (Net)</th>
              <th className="px-3 py-2 text-left">İl/İlçe</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const m = metricsMap[p.id!];
              return (
                <tr key={p.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link href={`/projeler/${p.id}`} className="text-blue-600 hover:underline">
                      {p.ad}
                    </Link>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{p.musteri_id}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{p.durum}</td>
                  <td className="px-3 py-2 text-right"><Money value={p.anlasma_net} /></td>
                  <td className="px-3 py-2 text-right"><Money value={p.anlasma_brut ?? 0} /></td>
                  <td className="px-3 py-2 text-right"><Money value={m?.maliyet ?? 0} /></td>
                  <td className="px-3 py-2 text-right"><Money value={m?.kar ?? 0} /></td>
                  <td className="px-3 py-2 whitespace-nowrap">{p.il ?? ''} / {p.ilce ?? ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-11/12 max-w-lg overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-medium mb-4">Yeni Proje</h3>
            <form onSubmit={handleNewProject} className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm">Müşteri</label>
                <select {...newProjForm.register('musteri_id')} className="border rounded-lg p-2">
                  <option value="">Seçiniz</option>
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.unvan}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm">Proje Adı</label>
                <input type="text" {...newProjForm.register('ad')} className="border rounded-lg p-2" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm">Durum</label>
                <select {...newProjForm.register('durum')} className="border rounded-lg p-2">
                  <option value="Teklif">Teklif</option>
                  <option value="Devam">Devam</option>
                  <option value="Beklemede">Beklemede</option>
                  <option value="Tamamlandı">Tamamlandı</option>
                  <option value="İptal">İptal</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm">Anlaşma Net</label>
                <input type="number" step="0.01" {...newProjForm.register('anlasma_net', { valueAsNumber: true })} className="border rounded-lg p-2" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm">KDV Oranı</label>
                <input type="number" step="0.01" {...newProjForm.register('kdv_oran', { valueAsNumber: true })} className="border rounded-lg p-2" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm">Başlangıç Tarihi</label>
                <input type="date" {...newProjForm.register('baslangic')} className="border rounded-lg p-2" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm">İl</label>
                <input type="text" {...newProjForm.register('il')} className="border rounded-lg p-2" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm">İlçe</label>
                <input type="text" {...newProjForm.register('ilce')} className="border rounded-lg p-2" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm">Konum</label>
                <input type="text" {...newProjForm.register('konum')} className="border rounded-lg p-2" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm">Açıklama</label>
                <textarea {...newProjForm.register('aciklama')} className="border rounded-lg p-2" rows={3}></textarea>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-2 bg-gray-200 rounded-xl text-sm">
                  Kapat
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
