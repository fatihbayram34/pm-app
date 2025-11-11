'use client';

import React, { useEffect, useState } from 'react';
import { subscribeProjects, Project } from '@/lib/db/projects';
import { subscribeReceipts, Receipt } from '@/lib/db/receipts';
import { subscribeExpenses, Expense } from '@/lib/db/expenses';
import { subscribeLabors, Labor } from '@/lib/db/labors';
import { subscribeLedger, LedgerDoc } from '@/lib/db/ledger';
import { projectCostNet } from '@/lib/agg';
import dayjs from '@/lib/date';
import { Money } from '@/components/Money';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [labors, setLabors] = useState<Labor[]>([]);
  const [ledger, setLedger] = useState<LedgerDoc[]>([]);

  useEffect(() => {
    const unsubs = [
      subscribeProjects(setProjects),
      subscribeReceipts(setReceipts),
      subscribeExpenses(setExpenses),
      subscribeLabors(setLabors),
      subscribeLedger(setLedger),
    ];
    return () => unsubs.forEach(u => u && (u as any)());
  }, []);

  // Proje bazlı stok çıkış net maliyeti (iade düşülerek)
  const stockOutByProject: Record<string, number> = (ledger ?? []).reduce((map, d) => {
    if (!d.proje_id) return map;
    let sign = 0;
    if (d.tip === 'cikis') sign = 1;
    else if (d.tip === 'iade') sign = -1;

    if (sign !== 0) {
      const docTotalNet = (d.satirlar ?? []).reduce((sum, r) => {
        const rowNet = (r.toplam_net ?? ((r.birim_maliyet_net ?? 0) * (r.miktar ?? 0)));
        return sum + rowNet;
      }, 0);
      map[d.proje_id] = (map[d.proje_id] ?? 0) + sign * docTotalNet;
    }
    return map;
  }, {} as Record<string, number>);

  // Toplam kâr (net) = anlaşma_net - (masraf + işçilik + stok çıkış)
  const totalProfitNet = projects.reduce((sum, proj) => {
    if (!proj.id) return sum; // guard: optional id
    const stockOut = stockOutByProject[proj.id] ?? 0;
    const costNet = projectCostNet(
      expenses.filter(e => e.proje_id === proj.id),
      labors.filter(l => l.proje_id === proj.id),
      stockOut
    );
    const profitNet = proj.anlasma_net - costNet;
    return sum + profitNet;
  }, 0);

  // Son 30 gün tahsilat (brüt) & masraf (net)
  const now = dayjs();
  const last30 = now.subtract(30, 'day');
  const totalReceipts30 = receipts
    .filter(r => dayjs(r.tarih.toDate?.() ?? r.tarih).isAfter(last30))
    .reduce((s, r) => s + (r.tutar_brut ?? 0), 0);

  const totalExpenses30 = expenses
    .filter(e => dayjs(e.tarih.toDate?.() ?? e.tarih).isAfter(last30))
    .reduce((s, e) => s + e.tutar_net + (e.kdv_maliyete_dahil ? (e.tutar_kdv ?? 0) : 0), 0);

  // Grafik: son 12 ay tahsilat vs masraf
  const months: string[] = Array.from({ length: 12 }).map((_, i) =>
    now.subtract(11 - i, 'month').format('MM.YYYY')
  );

  const monthly = months.map((m) => {
    const [mm, yyyy] = m.split('.');
    const start = dayjs(`${yyyy}-${mm}-01`).startOf('month');
    const end = start.endOf('month');

    const r = receipts.filter(x => {
      const d = dayjs(x.tarih.toDate?.() ?? x.tarih);
      return d.isSame(start, 'month') && d.isSame(start, 'year');
    }).reduce((s, x) => s + (x.tutar_brut ?? 0), 0);

    const e = expenses.filter(x => {
      const d = dayjs(x.tarih.toDate?.() ?? x.tarih);
      return d.isSame(start, 'month') && d.isSame(start, 'year');
    }).reduce((s, x) => s + x.tutar_net + (x.kdv_maliyete_dahil ? (x.tutar_kdv ?? 0) : 0), 0);

    return { ay: m, tahsilat: r, masraf: e };
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl p-4 bg-white shadow">
          <div className="text-sm text-gray-500">Toplam Tahsilat (Son 30 gün)</div>
          <div className="text-xl font-semibold"><Money value={totalReceipts30} /></div>
        </div>
        <div className="rounded-2xl p-4 bg-white shadow">
          <div className="text-sm text-gray-500">Toplam Masraf (Son 30 gün)</div>
          <div className="text-xl font-semibold"><Money value={totalExpenses30} /></div>
        </div>
        <div className="rounded-2xl p-4 bg-white shadow">
          <div className="text-sm text-gray-500">Toplam Kâr (Net)</div>
          <div className="text-xl font-semibold"><Money value={totalProfitNet} /></div>
        </div>
        <div className="rounded-2xl p-4 bg-white shadow">
          <div className="text-sm text-gray-500">Proje Sayısı</div>
          <div className="text-xl font-semibold">{projects.length}</div>
        </div>
      </div>

      {/* Aylık Tahsilat vs Masraf */}
      <div className="rounded-2xl p-4 bg-white shadow">
        <div className="mb-2 font-semibold">Aylık Tahsilat (brüt) vs Masraf (net) – Son 12 Ay</div>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="colorR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopOpacity={0.35}/>
                  <stop offset="95%" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorE" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopOpacity={0.35}/>
                  <stop offset="95%" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ay" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="tahsilat" stroke="#8884d8" fillOpacity={1} fill="url(#colorR)" />
              <Area type="monotone" dataKey="masraf" stroke="#82ca9d" fillOpacity={1} fill="url(#colorE)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
