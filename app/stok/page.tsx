'use client';

import React, { useEffect, useState } from 'react';
import { subscribeLedger, LedgerDoc, addLedgerDoc } from '@/lib/db/ledger';
import { subscribeCatalog, CatalogItem } from '@/lib/db/catalog';
import { subscribeCustomers, Customer } from '@/lib/db/customers';
import { subscribeProjects, Project } from '@/lib/db/projects';
import { StockDocForm } from '@/components/StockDocForm';
import { inventoryBalances } from '@/lib/agg';
import { useToast } from '@/components/ToastProvider';

type BalanceMap = Record<string, Record<string, number>>;

/**
 * inventoryBalances çıktısını güvenle BalanceMap'e dönüştürür.
 * - Eğer dizi gelirse: {owner_musteri_id, proje_id, konum, katalog_id, miktar} satırlarını toplar.
 * - Eğer zaten map ise doğrudan döndürür.
 */
function toBalanceMap(input: unknown): BalanceMap {
  if (!input) return {};
  if (Array.isArray(input)) {
    const acc: BalanceMap = {};
    for (const row of input as any[]) {
      const ownerId = row.owner_musteri_id ?? 'unknown';
      const projId = row.proje_id ?? '-';
      const konum = row.konum ?? '-';

      // katalog id alan ismi farklı olabilir diye birkaç olası isim deniyoruz
      const catId =
        row.katalog_id ??
        row.catalog_id ??
        row.katalogId ??
        row.catalogId ??
        undefined;

      const qty = Number(row.miktar ?? row.quantity ?? 0);
      if (!catId) continue;

      const key = `${ownerId}|${projId}|${konum}`;
      acc[key] ??= {};
      acc[key][catId] = (acc[key][catId] ?? 0) + qty;
    }
    return acc;
  }
  // zaten map ise
  return input as BalanceMap;
}

export default function StockPage() {
  // Firestore’dan gelen STOK HAREKET LİSTESİ (dizi)
  const [ledgerList, setLedgerList] = useState<LedgerDoc[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    const unsubLed = subscribeLedger((data) => setLedgerList(data));
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

  // Form submit (StockDocForm kendi state’ini yönetiyor)
  const handleSubmit = async (values: any) => {
    try {
      await addLedgerDoc(values);
      showToast('Stok belgesi kaydedildi', 'success');
    } catch (err) {
      showToast('Stok belgesi eklenemedi', 'error');
    }
  };

  // Konsolide görünümler – adapter ile tip güvenli hale getir
  const rawBalances = inventoryBalances(ledgerList as any);
  const balances = toBalanceMap(rawBalances);

  // Depo konsolide tablo: owner -> item -> quantity
  const ownerTable: Record<string, Record<string, number>> = {};
  Object.keys(balances).forEach((locKey) => {
    // locKey: ownerId|projeId|konum
    const [ownerId] = locKey.split('|');
    const catBalances = balances[locKey] || {};
    if (!ownerTable[ownerId]) ownerTable[ownerId] = {};
    Object.keys(catBalances).forEach((catId) => {
      ownerTable[ownerId][catId] =
        (ownerTable[ownerId][catId] || 0) + (catBalances[catId] || 0);
    });
  });

  // Proje kalan tablo: zaten balances (owner|project|konum) anahtarında
  const projectTable = balances;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Stok</h2>

      {/* Stok Belgesi Oluştur */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow">
        <h3 className="text-lg font-medium mb-2">Stok Belgesi Oluştur</h3>
        <StockDocForm
          catalog={catalog
            .filter((c) => !!c.id)
            .map((c) => ({ id: c.id!, kod: c.kod, ad: c.ad, birim: c.birim }))}
          customers={customers
            .filter((c) => !!c.id)
            .map((c) => ({ id: c.id!, unvan: c.unvan }))}
          projects={projects
            .filter((p) => !!p.id)
            .map((p) => ({ id: p.id!, ad: p.ad, musteri_id: p.musteri_id }))}
          onSubmit={handleSubmit}
        />
      </div>

      {/* Depo Stok (Konsolide) */}
      <div>
        <h3 className="text-lg font-medium mb-2">Depo Stok (Konsolide)</h3>
        <div className="overflow-x-auto rounded-2xl bg-white dark:bg-gray-800 shadow">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-200 dark:bg-gray-700">
                <th className="px-3 py-2 text-left">Müşteri</th>
                {catalog.filter((c) => !!c.id).map((c) => (
                  <th key={c.id!} className="px-3 py-2 text-right">{c.kod}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.filter((cust) => !!cust.id).map((cust) => (
                <tr key={cust.id!} className="border-b dark:border-gray-700">
                  <td className="px-3 py-2 whitespace-nowrap">{cust.unvan}</td>
                  {catalog.filter((c) => !!c.id).map((c) => (
                    <td key={c.id!} className="px-3 py-2 text-right">
                      {ownerTable[cust.id!]?.[c.id!] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proje Kalan */}
      <div>
        <h3 className="text-lg font-medium mb-2">Proje Kalan</h3>
        <div className="overflow-x-auto rounded-2xl bg-white dark:bg-gray-800 shadow">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-200 dark:bg-gray-700">
                <th className="px-3 py-2 text-left">Sahip | Proje | Konum</th>
                {catalog.filter((c) => !!c.id).map((c) => (
                  <th key={c.id!} className="px-3 py-2 text-right">{c.kod}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(projectTable).map((key) => (
                <tr key={key} className="border-b dark:border-gray-700">
                  <td className="px-3 py-2 whitespace-nowrap">{key}</td>
                  {catalog.filter((c) => !!c.id).map((c) => (
                    <td key={c.id!} className="px-3 py-2 text-right">
                      {projectTable[key]?.[c.id!] ?? 0}
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