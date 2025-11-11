import { Timestamp } from 'firebase/firestore';

/** Veri tipleri tanımları */
export interface Customer {
  id: string;
  unvan: string;
  toplam_anlasma_brut?: number;
  toplam_tahsilat_brut?: number;
  bakiye_brut?: number;
}

export interface Project {
  id: string;
  musteri_id: string;
  anlasma_net: number;
  anlasma_kdv: number;
  anlasma_brut: number;
  toplam_maliyet_net?: number;
}

export interface Receipt {
  id: string;
  musteri_id: string;
  tutar_brut: number;
  tarih: Timestamp;
}

export interface Expense {
  id: string;
  proje_id: string;
  tutar_net: number;
  tutar_kdv?: number;
  tutar_brut?: number;
  kdv_maliyete_dahil?: boolean;
}

export interface Labor {
  id: string;
  proje_id: string;
  tutar_net: number;
}

export interface InventoryRow {
  katalog_id: string;
  miktar: number;
  birim: string;
  birim_maliyet_net?: number;
  toplam_net?: number;
}

export interface LedgerDoc {
  id: string;
  tarih: Timestamp;
  tip: 'giris' | 'cikis' | 'iade' | 'transfer';
  konum: 'depo' | 'santiye';
  owner_musteri_id: string;
  proje_id?: string;
  satirlar: InventoryRow[];
}

/**
 * Müşteri bazında brüt bakiye hesaplar. Bakiye = anlaşma brüt toplamı − tahsilat brüt toplamı.
 */
export function customerBalanceBrut(
  customers: Customer[],
  projects: Project[],
  receipts: Receipt[],
): { [customerId: string]: { toplam_anlasma_brut: number; toplam_tahsilat_brut: number; bakiye_brut: number } } {
  const result: { [id: string]: { toplam_anlasma_brut: number; toplam_tahsilat_brut: number; bakiye_brut: number } } = {};
  customers.forEach((cust) => {
    result[cust.id] = {
      toplam_anlasma_brut: 0,
      toplam_tahsilat_brut: 0,
      bakiye_brut: 0,
    };
  });
  projects.forEach((p) => {
    if (result[p.musteri_id]) {
      result[p.musteri_id].toplam_anlasma_brut += p.anlasma_brut;
    }
  });
  receipts.forEach((r) => {
    if (result[r.musteri_id]) {
      result[r.musteri_id].toplam_tahsilat_brut += r.tutar_brut;
    }
  });
  Object.keys(result).forEach((id) => {
    const v = result[id];
    v.bakiye_brut = v.toplam_anlasma_brut - v.toplam_tahsilat_brut;
  });
  return result;
}

/**
 * Projeye ait net maliyet toplamı ve brüt kâr hesaplar.
 * Kâr (net) = anlaşma net − (masraf net + işçilik net + stok çıkış net)
 */
// lib/agg.ts

export function projectCostNet(
  expenses: { tutar_net: number; kdv_maliyete_dahil?: boolean; tutar_kdv?: number }[],
  labors: { tutar_net: number }[],
  stockOutNet: number
) {
  const expenseNet = expenses.reduce((sum, e) => {
    const kdv = e.kdv_maliyete_dahil ? (e.tutar_kdv ?? 0) : 0;
    return sum + e.tutar_net + kdv;
  }, 0);

  const laborNet = labors.reduce((s, l) => s + l.tutar_net, 0);

  return expenseNet + laborNet + stockOutNet;
}


/**
 * Stok bakiye hesaplamaları. Giriş/iade pozitif, çıkış negatif.
 * Envanteri owner, proje ve konum bazında gruplayarak miktarları toplar.
 */
export function inventoryBalances(ledger: LedgerDoc[]): {
  [key: string]: {
    [katalogId: string]: number;
  };
} {
  const balances: {
    [key: string]: {
      [katalogId: string]: number;
    };
  } = {};
  ledger.forEach((doc) => {
    const sign = doc.tip === 'giris' || doc.tip === 'iade' ? 1 : doc.tip === 'cikis' ? -1 : 0;
    const owner = doc.owner_musteri_id;
    const location = doc.proje_id ? `${owner}|${doc.proje_id}|${doc.konum}` : `${owner}|depo|${doc.konum}`;
    if (!balances[location]) balances[location] = {};
    doc.satirlar.forEach((row) => {
      const current = balances[location][row.katalog_id] || 0;
      balances[location][row.katalog_id] = current + sign * row.miktar;
    });
  });
  return balances;
}
