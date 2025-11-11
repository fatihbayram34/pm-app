'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { projectCostNet } from '@/lib/agg';
import { subscribeProjects, Project } from '@/lib/db/projects';
import { subscribeExpenses, Expense } from '@/lib/db/expenses';
import { subscribeLabors, Labor } from '@/lib/db/labors';
import { subscribeLedger, LedgerDoc } from '@/lib/db/ledger';
import { Money } from '@/components/Money';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [labors, setLabors] = useState<Labor[]>([]);
  const [ledger, setLedger] = useState<LedgerDoc[]>([]);

  useEffect(() => {
    const unsubs = [
      subscribeProjects(setProjects),
      subscribeExpenses(setExpenses),
      subscribeLabors(setLabors),
      subscribeLedger(setLedger), // <- stok hareketleri için canlı dinleyici
    ];
    return () => unsubs.forEach((u) => u && (u as any)());
  }, []);

  const proj = projects.find((p) => p.id === id);

  const expensesForThisProject = expenses.filter((e) => e.proje_id === id);
  const laborsForThisProject = labors.filter((l) => l.proje_id === id);

  // Bu proje için stok NET maliyeti:
  // 'cikis' (+) ve 'iade' (-). Satır neti: toplam_net varsa onu, yoksa birim_maliyet_net * miktar.
  const stockOut = (ledger ?? []).reduce((sum, d) => {
    if (d.proje_id !== id) return sum;

    let sign = 0;
    if (d.tip === 'cikis') sign = 1;
    else if (d.tip === 'iade') sign = -1;
    if (sign === 0) return sum;

    const docTotalNet = (d.satirlar ?? []).reduce((s, r) => {
      const rowNet = (r.toplam_net ?? ((r.birim_maliyet_net ?? 0) * (r.miktar ?? 0)));
      return s + rowNet;
    }, 0);

    return sum + sign * docTotalNet;
  }, 0);

  const costNet = projectCostNet(expensesForThisProject, laborsForThisProject, stockOut);
  const profitNet = (proj?.anlasma_net ?? 0) - costNet;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Proje Detayı</h2>

      {proj ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl p-4 bg-white shadow">
            <div className="text-sm text-gray-500">Anlaşma (Net)</div>
            <div className="text-xl font-semibold"><Money value={proj.anlasma_net} /></div>
          </div>
          <div className="rounded-2xl p-4 bg-white shadow">
            <div className="text-sm text-gray-500">Toplam Maliyet (Net)</div>
            <div className="text-xl font-semibold"><Money value={costNet} /></div>
          </div>
          <div className="rounded-2xl p-4 bg-white shadow">
            <div className="text-sm text-gray-500">Brüt Kâr (Net)</div>
            <div className="text-xl font-semibold"><Money value={profitNet} /></div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-4 bg-white shadow">Proje yükleniyor…</div>
      )}
    </div>
  );
}