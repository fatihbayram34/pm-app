import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import { db } from '../firebaseClient';
import { UnitEnum } from './catalog';

const COLLECTION = 'inventoryLedger';

const LedgerRowSchema = z.object({
  katalog_id: z.string().min(1),
  miktar: z.number(),
  birim: UnitEnum,
  birim_maliyet_net: z.number().optional(),
  toplam_net: z.number().optional(),
});

export const LedgerSchema = z.object({
  id: z.string().optional(),
  tarih: z.any(),
  tip: z.union([z.literal('giris'), z.literal('cikis'), z.literal('iade'), z.literal('transfer')]),
  konum: z.union([z.literal('depo'), z.literal('santiye')]),
  owner_musteri_id: z.string().min(1),
  proje_id: z.string().optional(),
  satirlar: z.array(LedgerRowSchema).min(1),
  aciklama: z.string().optional(),
  createdAt: z.any().optional(),
});

export type LedgerDoc = z.infer<typeof LedgerSchema>;

export function subscribeLedger(callback: (items: LedgerDoc[]) => void) {
  const q = query(collection(db, COLLECTION));
  return onSnapshot(q, (snap) => {
    const data: LedgerDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LedgerDoc, 'id'>) }));
    callback(data);
  });
}

export async function addLedgerDoc(data: Omit<LedgerDoc, 'id' | 'createdAt'>) {
  const now = Timestamp.now();
  await addDoc(collection(db, COLLECTION), { ...data, createdAt: now });
}

export async function updateLedgerDoc(id: string, data: Partial<LedgerDoc>) {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, data);
}

export async function deleteLedgerDoc(id: string) {
  await deleteDoc(doc(db, COLLECTION, id));
}