import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import { db } from '../firebaseClient';

const COLLECTION = 'checklists';

export const ChecklistSchema = z.object({
  id: z.string().optional(),
  proje_id: z.string().min(1),
  baslik: z.string().min(1),
  durum: z.union([z.literal('Açık'), z.literal('Kapalı')]),
  tarih: z.any().optional(),
  not: z.string().optional(),
  sorumlu: z.string().optional(),
  createdAt: z.any().optional(),
});

export type Checklist = z.infer<typeof ChecklistSchema>;

export function subscribeChecklists(callback: (items: Checklist[]) => void) {
  const q = query(collection(db, COLLECTION));
  return onSnapshot(q, (snap) => {
    const data: Checklist[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Checklist, 'id'>) }));
    callback(data);
  });
}

export async function addChecklistItem(data: Omit<Checklist, 'id' | 'createdAt'>) {
  await addDoc(collection(db, COLLECTION), { ...data, createdAt: Timestamp.now() });
}

export async function updateChecklistItem(id: string, data: Partial<Checklist>) {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, data);
}

export async function deleteChecklistItem(id: string) {
  await deleteDoc(doc(db, COLLECTION, id));
}