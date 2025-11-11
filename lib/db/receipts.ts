import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import { db } from '../firebaseClient';

const COLLECTION = 'receipts';

export const ReceiptMethodEnum = z.union([
  z.literal('Havale/EFT'),
  z.literal('Nakit'),
  z.literal('POS'),
  z.literal('Çek/Senet'),
  z.literal('Diğer'),
]);

export const ReceiptAllocationSchema = z.object({
  proje_id: z.string(),
  tutar_brut: z.number().nonnegative(),
});

export const ReceiptSchema = z.object({
  id: z.string().optional(),
  musteri_id: z.string().min(1),
  tarih: z.any(),
  tutar_brut: z.number().nonnegative(),
  yontem: ReceiptMethodEnum,
  aciklama: z.string().optional(),
  allocations: z.array(ReceiptAllocationSchema).optional(),
  createdAt: z.any().optional(),
});

export type Receipt = z.infer<typeof ReceiptSchema>;

export function subscribeReceipts(callback: (receipts: Receipt[]) => void) {
  const q = query(collection(db, COLLECTION));
  return onSnapshot(q, (snap) => {
    const data: Receipt[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Receipt, 'id'>) }));
    callback(data);
  });
}

export async function addReceipt(data: Omit<Receipt, 'id' | 'createdAt'>) {
  await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: Timestamp.now(),
  });
}

export async function updateReceipt(id: string, data: Partial<Receipt>) {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, data);
}

export async function deleteReceipt(id: string) {
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
}