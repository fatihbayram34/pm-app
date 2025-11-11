import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import { db } from '../firebaseClient';

const COLLECTION = 'expenses';

export const ExpenseSchema = z.object({
  id: z.string().optional(),
  proje_id: z.string().min(1),
  tarih: z.any(),
  kategori: z.string().min(1),
  tutar_net: z.number().nonnegative(),
  kdv_oran: z.number().optional(),
  tutar_kdv: z.number().optional(),
  tutar_brut: z.number().optional(),
  kdv_maliyete_dahil: z.boolean().default(false).optional(),
  fatura_no: z.string().optional(),
  aciklama: z.string().optional(),
  belge_url: z.string().optional(),
  createdAt: z.any().optional(),
});

export type Expense = z.infer<typeof ExpenseSchema>;

export function subscribeExpenses(callback: (expenses: Expense[]) => void) {
  const q = query(collection(db, COLLECTION));
  return onSnapshot(q, (snap) => {
    const data: Expense[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Expense, 'id'>) }));
    callback(data);
  });
}

export async function addExpense(data: Omit<Expense, 'id' | 'createdAt'>) {
  await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: Timestamp.now(),
  });
}

export async function updateExpense(id: string, data: Partial<Expense>) {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, data);
}

export async function deleteExpense(id: string) {
  await deleteDoc(doc(db, COLLECTION, id));
}