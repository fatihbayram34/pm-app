"use client";

import React, { useEffect, useState } from 'react';
import {
  subscribeProjects,
  Project,
  addProject,
  ProjectSchema,
} from '@/lib/db/projects';
import { subscribeReceipts, Receipt } from '@/lib/db/receipts';
import { subscribeExpenses, Expense } from '@/lib/db/expenses';
import { subscribeLabors, Labor } from '@/lib/db/labors';
import { subscribeLedger, LedgerDoc } from '@/lib/db/ledger';
import { customerBalanceBrut, projectCostNet } from '@/lib/agg';
import { Money } from '@/components/Money';
import { KdvBadge } from '@/components/KdvBadge';
import { DatePickerTR } from '@/components/DatePickerTR';
import { StatusBadge } from '@/components/StatusBadge';
import { ToastProvider, useToast } from '@/components/ToastProvider';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from '@/lib/date';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [labors, setLabors] = useState<Labor[]>([]);
  const [ledger, setLedger] = useState<LedgerDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Subscribe to data
  useEffect(() => {
    const unsubProjects = subscribeProjects((data) => setProjects(data));
    const unsubReceipts = subscribeReceipts((data) => setReceipts(data));
    const unsubExpenses = subscribeExpenses((data) => setExpenses(data));
    const unsubLabors = subscribeLabors((data) => setLabors(data));
    const unsubLedger = subscribeLedger((data) => setLedger(data));
    setLoading(false);
    return () => {
      unsubProjects();
      unsubReceipts();
      unsubExpenses();
      unsubLabors();
      unsubLedger();
    };
  }, []);

  // Compute metrics
  const today = dayjs();
  const thirtyDaysAgo = today.subtract(30, 'day');
  const last30Receipts = receipts.filter((r) => dayjs(r.tarih.toDate ? r.tarih.toDate() : r.tarih).isAfter(thirtyDaysAgo));
  const last30Expenses = expenses.filter((e) => dayjs(e.tarih.toDate ? e.tarih.toDate() : e.tarih).isAfter(thirtyDaysAgo));
  const totalReceiptLast30 = last30Receipts.reduce((sum, r) => sum + r.tutar_brut, 0);
  const totalExpenseLast30 = last30Expenses.reduce((sum, e) => sum + e.tutar_net, 0);

  // Total kar net across all projects
const totalProfitNet = projects.reduce((sum, proj) => {
  const stockOut = stockOutByProject[proj.id] ?? 0;
  const costNet = projectCostNet(
    expenses.filter(e => e.proje_id === proj.id),
    labors.filter(l => l.proje_id === proj.id),
    stockOut
  );
  const profitNet = proj.anlasma_net - costNet;
  return sum + profitNet;
}, 0);


  // Top 5 profitable projects (net profit) and top 5 expensive (cost)
  const projectMetrics = projects.map((proj) => {
    const stockOut = ledger
      .filter((doc) => doc.proje_id === proj.id && doc.tip === 'cikis')
      .reduce((s, doc) => s + doc.satirlar.reduce((t, row) => t + (row.toplam_net ?? 0), 0), 0);
    const cost = projectCostNet(
  expenses.filter(e => e.proje_id === proj.id),
  labors.filter(l => l.proje_id === proj.id),
  stockOut
);

    return {
      id: proj.id,
      ad: proj.ad,
      kar: cost.kar_net,
      maliyet: cost.maliyet_net,
    };
  });
  const topProfit = [...projectMetrics]
    .sort((a, b) => b.kar - a.kar)
    .slice(0, 5);
  const topCost = [...projectMetrics]
    .sort((a, b) => b.maliyet - a.maliyet)
    .slice(0, 5);

  // Monthly chart: last 12 months
  const last12Months: { month: string; receipts: number; expenses: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const monthStart = today.subtract(i, 'month').startOf('month');
    const monthEnd = today.subtract(i, 'month').endOf('month');
    const monthLabel = monthStart.format('MM.YYYY');
    const receiptsSum = receipts
      .filter((r) => {
        const dt = dayjs(r.tarih.toDate ? r.tarih.toDate() : r.tarih);
        return dt.isAfter(monthStart) && dt.isBefore(monthEnd);
      })
      .reduce((s, r) => s + r.tutar_brut, 0);
    const expensesSum = expenses
      .filter((e) => {
        const dt = dayjs(e.tarih.toDate ? e.tarih.toDate() : e.tarih);
        return dt.isAfter(monthStart) && dt.isBefore(monthEnd);
      })
      .reduce((s, e) => s + e.tutar_net, 0);
    last12Months.push({ month: monthLabel, receipts: receiptsSum, expenses: expensesSum });
  }

  // Project status distribution for pie chart
  const statusCounts: Record<string, number> = {};
  projects.forEach((p) => {
    statusCounts[p.durum] = (statusCounts[p.durum] || 0) + 1;
  });
  const statusData = Object.keys(statusCounts).map((status) => ({ name: status, value: statusCounts[status] }));
  const pieColors = ['#10B981', '#F59E0B', '#6366F1', '#EF4444', '#A78BFA'];

  // New project form state
  const [showNewProj, setShowNewProj] = useState(false);
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

  // Dummy customers for project creation (should come from Firestore). We'll infer from receipts or forms but using first receipts customer.
  const dummyCustomers = receipts
    .map((r) => ({ id: r.musteri_id, unvan: r.musteri_id }))
    .reduce((arr, curr) => {
      if (!arr.find((c) => c.id === curr.id)) arr.push(curr);
      return arr;
    }, [] as { id: string; unvan: string }[]);

  const handleNewProjSubmit = newProjForm.handleSubmit(async (values) => {
    try {
      await addProject({
        musteri_id: values.musteri_id,
        ad: values.ad,
        durum: values.durum as any,
        anlasma_net: values.anlasma_net,
        kdv_oran: values.kdv_oran,
        baslangic: values.baslangic as any,
        aciklama: values.aciklama,
      });
      showToast('Proje oluşturuldu', 'success');
      setShowNewProj(false);
      newProjForm.reset();
    } catch (err) {
      showToast('Proje eklenemedi', 'error');
    }
  });

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      {loading ? (
        <p>Yükleniyor...</p>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow">
              <h3 className="text-sm font-medium mb-1">Toplam Tahsilat (30g)</h3>
              <Money value={totalReceiptLast30} className="text-xl font-bold" />
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow">
              <h3 className="text-sm font-medium mb-1">Toplam Masraf (30g)</h3>
              <Money value={totalExpenseLast30} className="text-xl font-bold" />
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow">
              <h3 className="text-sm font-medium mb-1">Toplam Kâr (Net)</h3>
              <Money value={totalProfitNet} className="text-xl font-bold" />
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow">
              <h3 className="text-sm font-medium mb-1">Proje Sayısı</h3>
              <p className="text-xl font-bold">{projects.length}</p>
            </div>
          </div>
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow h-72">
              <h3 className="text-sm font-medium mb-2">Aylık Tahsilat vs Masraf</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last12Months} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="receipts" fill="#10B981" name="Tahsilat" />
                  <Bar dataKey="expenses" fill="#EF4444" name="Masraf" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow h-72">
              <h3 className="text-sm font-medium mb-2">Proje Durum Dağılımı</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Top lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow">
              <h3 className="text-sm font-medium mb-2">En Kârlı 5 Proje</h3>
              <ul>
                {topProfit.map((p) => (
                  <li key={p.id} className="flex justify-between py-1 text-sm">
                    <span>{p.ad}</span>
                    <Money value={p.kar} />
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow">
              <h3 className="text-sm font-medium mb-2">En Pahalı 5 Proje</h3>
              <ul>
                {topCost.map((p) => (
                  <li key={p.id} className="flex justify-between py-1 text-sm">
                    <span>{p.ad}</span>
                    <Money value={p.maliyet} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {/* Quick actions */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow">
            <h3 className="text-sm font-medium mb-2">Hızlı Aksiyonlar</h3>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowNewProj(true)} className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm">
                Yeni Proje
              </button>
              {/* Diğer butonlar: Yeni Tahsilat, Stok Belgesi, Gider Girişi */}
              <button onClick={() => showToast('Bu özellik iskelette mevcut değil', 'info')} className="px-3 py-2 bg-green-600 text-white rounded-xl text-sm">
                Yeni Tahsilat
              </button>
              <button onClick={() => showToast('Bu özellik iskelette mevcut değil', 'info')} className="px-3 py-2 bg-yellow-500 text-white rounded-xl text-sm">
                Stok Belgesi
              </button>
              <button onClick={() => showToast('Bu özellik iskelette mevcut değil', 'info')} className="px-3 py-2 bg-purple-600 text-white rounded-xl text-sm">
                Gider Girişi
              </button>
            </div>
          </div>
          {/* New Project Modal */}
          {showNewProj && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" role="dialog" aria-modal="true">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-11/12 max-w-lg">
                <h3 className="text-lg font-medium mb-4">Yeni Proje</h3>
                <form onSubmit={handleNewProjSubmit} className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm">Müşteri</label>
                    <select
                      {...newProjForm.register('musteri_id')}
                      className="border rounded-lg p-2"
                    >
                      <option value="">Seçiniz</option>
                      {dummyCustomers.map((c) => (
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
                    <label className="text-sm">Başlangıç</label>
                    <input type="date" {...newProjForm.register('baslangic')} className="border rounded-lg p-2" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm">Açıklama</label>
                    <textarea {...newProjForm.register('aciklama')} className="border rounded-lg p-2"></textarea>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowNewProj(false)}
                      className="px-3 py-2 text-sm bg-gray-200 rounded-xl"
                    >
                      Vazgeç
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl">
                      Kaydet
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
