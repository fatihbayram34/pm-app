'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Money } from '@/components/Money';
import { projectCostNet } from '@/lib/agg';

import { subscribeProjects, Project } from '@/lib/db/projects';
import { subscribeExpenses, Expense } from '@/lib/db/expenses';
import { subscribeLabors, Labor } from '@/lib/db/labors';
import { subscribeLedger, LedgerDoc } from '@/lib/db/ledger';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [labors, setLabors] = useState<Labor[]>([]);
  const [ledger, setLedger] = useState<LedgerDoc[]>([]);

  useEffect(() => {
    const unsubs = [
      subscribeProjects(setProjects),
      subscribeExpenses(setExpenses),
      subscribeLabors(setLabors),
      subscribeLedger(setLedger),
    ];
    return () => unsubs.forEach((u) => u && (u as any)());
  }, []);

  // id zorunlu olacak şekilde güvene al
  const projectsSafe = projects.filter(p => !!p.id).map(p => ({ ...p, id: p.id! }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Projeler</h2>

      <div className="rounded-2xl p-4 bg-white shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Proje</th>
              <th className="py-2">Durum</th>
              <th className="py-2">İl/İlçe</th>
              <th className="py-2">Anlaşma (Net)</th>
              <th className="py-2">Toplam Maliyet (Net)</th>
              <th className="py-2">Brüt Kâr (Net)</th>
            </tr>
          </thead>
          <tbody>
            {projectsSafe.map((proj) => {
              // Bu proje için stok NET maliyeti (ledger'dan canlı):
              // 'cikis' (+) ve 'iade' (-). Satır neti: toplam_net varsa onu, yoksa birim_maliyet_net * miktar.
              const stockOut = (ledger ?? []).reduce((sum, d) => {
                if (d.proje_id !== proj.id) return sum;

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

              const costNet = projectCostNet(
                expenses.filter((e) => e.proje_id === proj.id),
                labors.filter((l) => l.proje_id === proj.id),
                stockOut
              );

              const profitNet = (proj.anlasma_net ?? 0) - costNet;

              return (
                <tr key={proj.id} className="border-t">
                  <td className="py-2">
                    <Link href={`/projeler/${proj.id}`} className="underline">
                      {proj.ad}
                    </Link>
                  </td>
                  <td className="py-2">{proj.durum}</td>
                  <td className="py-2">
                    {proj.il ?? '-'}{proj.ilce ? ` / ${proj.ilce}` : ''}
                  </td>
                  <td className="py-2"><Money value={proj.anlasma_net ?? 0} /></td>
                  <td className="py-2"><Money value={costNet} /></td>
                  <td className="py-2">
                    <span className={profitNet >= 0 ? 'text-green-700' : 'text-red-700'}>
                      <Money value={profitNet} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}