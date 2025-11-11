"use client";

import React, { useEffect, useState } from 'react';
import { subscribeLedger, LedgerDoc, addLedgerDoc } from '@/lib/db/ledger';
import { subscribeCatalog, CatalogItem } from '@/lib/db/catalog';
import { subscribeCustomers, Customer } from '@/lib/db/customers';
import { subscribeProjects, Project } from '@/lib/db/projects';
import { StockDocForm } from '@/components/StockDocForm';
import { inventoryBalances } from '@/lib/agg';
import { useToast } from '@/components/ToastProvider';

export default function StockPage() {
  const [ledger, setLedger] = useState<LedgerDoc[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    const unsubLed = subscribeLedger((data) => setLedger(data));
    const unsubCat = subscribeCatalog((data) => setCatalog(data));
    const unsubCust = subscribeCustomers((data) => setCustomers(data));
    const unsubProj = subscribeProjects((data) => setProjects(data));
    return () => {
      unsubLed();
      unsubCat();
      unsubCust();
      unsubProj();
    };
  }, []);

  const handleSubmit = async (values: any) => {
    try {
      await addLedgerDoc(values);
      showToast('Stok belgesi kaydedildi', 'success');
    } catch (err) {
      showToast('Stok belgesi eklenemedi', 'error');
    }
  };

  // Aggregation for stock views
  const balances = inventoryBalances(ledger);
  // Build consolidated table: owner -> item -> quantity
  const ownerTable: Record<string, Record<string, number>> = {};
  Object.keys(balances).forEach((loc) => {
    // loc key format: owner|proje|konum
    const [ownerId] = loc.split('|');
    const catBalances = balances[loc];
    if (!ownerTable[ownerId]) ownerTable[ownerId] = {};
    Object.keys(catBalances).forEach((catId) => {
      ownerTable[ownerId][catId] = (ownerTable[ownerId][catId] || 0) + catBalances[catId];
    });
  });

  // Project remaining table: owner|project|location -> item -> quantity
  const projectTable = balances; // Already keyed by owner|project|konum

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Stok</h2>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow">
        <h3 className="text-lg font-medium mb-2">Stok Belgesi Oluştur</h3>
        <StockDocForm
          catalog={catalog.map((c) => ({ id: c.id!, kod: c.kod, ad: c.ad, birim: c.birim }))}
          customers={customers.map((c) => ({ id: c.id!, unvan: c.unvan }))}
          projects={projects.map((p) => ({ id: p.id!, ad: p.ad, musteri_id: p.musteri_id }))}
          onSubmit={handleSubmit}
        />
      </div>
      <div>
        <h3 className="text-lg font-medium mb-2">Depo Stok (Konsolide)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-200 dark:bg-gray-700">
                <th className="px-3 py-2">Müşteri</th>
                {catalog.map((c) => (
                  <th key={c.id} className="px-3 py-2 text-right">
                    {c.kod}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((cust) => (
                <tr key={cust.id} className="border-b dark:border-gray-700">
                  <td className="px-3 py-2 whitespace-nowrap">{cust.unvan}</td>
                  {catalog.map((c) => (
                    <td key={c.id} className="px-3 py-2 text-right">
                      {ownerTable[cust.id!]?.[c.id!] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-medium mb-2">Proje Kalan</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-200 dark:bg-gray-700">
                <th className="px-3 py-2">Sahip|Proje|Konum</th>
                {catalog.map((c) => (
                  <th key={c.id} className="px-3 py-2 text-right">{c.kod}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(projectTable).map((key) => (
                <tr key={key} className="border-b dark:border-gray-700">
                  <td className="px-3 py-2 whitespace-nowrap">{key}</td>
                  {catalog.map((c) => (
                    <td key={c.id} className="px-3 py-2 text-right">
                      {projectTable[key][c.id!] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}