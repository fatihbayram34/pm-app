import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import { db } from '../firebaseClient';

const COLLECTION = 'labors';

export const LaborSchema = z.object({
  id: z.string().optional(),
  proje_id: z.string().min(1),
  tarih: z.any(),
  personel: z.string().min(1),
  saat: z.number().optional(),
  gun: z.number().optional(),
  tutar_net: z.number().nonnegative(),
  aciklama: z.string().optional(),
  createdAt: z.any().optional(),
});

export type Labor = z.infer<typeof LaborSchema>;

export function subscribeLabors(callback: (labors: Labor[]) => void) {
  const q = query(collection(db, COLLECTION));
  return onSnapshot(q, (snap) => {
    const data: Labor[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Labor, 'id'>) }));
    callback(data);
  });
}

export async function addLabor(data: Omit<Labor, 'id' | 'createdAt'>) {
  await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: Timestamp.now(),
  });
}

export async function updateLabor(id: string, data: Partial<Labor>) {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, data);
}

export async function deleteLabor(id: string) {
  await deleteDoc(doc(db, COLLECTION, id));
}