import { Timestamp } from 'firebase/firestore';

/** Basit tipler (yalın) */
export interface Customer {
  id: string;
  unvan: string;
  toplam_anlasma_brut?: number;
  toplam_tahsilat_brut?: number;
  bakiye_brut?: number;
}
export interface Receipt {
  musteri_id: string;
  tutar_brut: number;
  tarih: any;
}
export interface Project {
  id: string;
  musteri_id: string;
  anlasma_net: number;
  anlasma_kdv: number;
  anlasma_brut: number;
}
export interface Expense {
  proje_id: string;
  tutar_net: number;
  kdv_maliyete_dahil?: boolean;
  tutar_kdv?: number;
}
export interface Labor {
  proje_id: string;
  tutar_net: number;
}
export interface LedgerRow {
  katalog_id: string;
  miktar: number;
  birim: string;
  birim_maliyet_net?: number;
  toplam_net?: number;
}
export interface LedgerDoc {
  proje_id?: string;
  owner_musteri_id: string;
  tip: 'giris' | 'cikis' | 'iade' | 'transfer';
  konum: 'depo' | 'santiye';
  tarih: any;
  satirlar: LedgerRow[];
}

/** Cari bakiye (brüt) = projelerin anlasma_brut toplamı − tahsilat toplamı */
export function customerBalanceBrut(
  customers: Customer[],
  projects: Project[],
  receipts: Receipt[]
) {
  const projByCustomer = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.musteri_id] = (acc[p.musteri_id] ?? 0) + (p.anlasma_brut ?? 0);
    return acc;
  }, {});
  const recByCustomer = receipts.reduce<Record<string, number>>((acc, r) => {
    acc[r.musteri_id] = (acc[r.musteri_id] ?? 0) + (r.tutar_brut ?? 0);
    return acc;
  }, {});
  return customers.map((c) => {
    const toplam_anlasma_brut = projByCustomer[c.id] ?? 0;
    const toplam_tahsilat_brut = recByCustomer[c.id] ?? 0;
    const bakiye_brut = toplam_anlasma_brut - toplam_tahsilat_brut;
    return { ...c, toplam_anlasma_brut, toplam_tahsilat_brut, bakiye_brut };
  });
}

/** Proje net maliyeti (masraf + işçilik + stok çıkış netleri) */
export function projectCostNet(
  expenses: Expense[],
  labors: Labor[],
  stockOutNet: number
) {
  const expenseNet = (expenses ?? []).reduce((sum, e) => {
    const kdv = e.kdv_maliyete_dahil ? (e.tutar_kdv ?? 0) : 0;
    return sum + e.tutar_net + kdv;
  }, 0);
  const laborNet = (labors ?? []).reduce((s, l) => s + l.tutar_net, 0);
  return expenseNet + laborNet + (stockOutNet ?? 0);
}

/** Konsolide stok bakiyesi: owner & proje & konum kırılımına göre miktar */
export function inventoryBalances(ledger: LedgerDoc[]) {
  type Key = string;
  const key = (owner: string, proje: string | undefined, konum: string) =>
    `${owner}||${proje ?? ''}||${konum}`;

  const map = new Map<Key, number>();

  for (const doc of ledger ?? []) {
    const k = key(doc.owner_musteri_id, doc.proje_id, doc.konum);
    // miktar işareti: giris +, cikis -, iade + (depo'ya iade stok artırır), transfer 0
    let sign = 0;
    if (doc.tip === 'giris') sign = 1;
    else if (doc.tip === 'cikis') sign = -1;
    else if (doc.tip === 'iade') sign = 1;

    const miktarToplam = (doc.satirlar ?? []).reduce((s, r) => s + (r.miktar ?? 0), 0);
    const prev = map.get(k) ?? 0;
    map.set(k, prev + sign * miktarToplam);
  }

  // Diziye dök
  return Array.from(map.entries()).map(([k, qty]) => {
    const [owner, proje, konum] = k.split('||');
    return { owner_musteri_id: owner, proje_id: proje || undefined, konum, miktar: qty };
  });
}
