import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import { db } from '../firebaseClient';

const COLLECTION = 'files';

export const FileSchema = z.object({
  id: z.string().optional(),
  proje_id: z.string().min(1),
  tip: z.union([z.literal('foto'), z.literal('pdf'), z.literal('sozlesme'), z.literal('kesif'), z.literal('diger')]),
  url: z.string().min(1),
  aciklama: z.string().optional(),
  tarih: z.any(),
  createdAt: z.any().optional(),
});

export type FileDoc = z.infer<typeof FileSchema>;

export function subscribeFiles(callback: (files: FileDoc[]) => void) {
  const q = query(collection(db, COLLECTION));
  return onSnapshot(q, (snap) => {
    const data: FileDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FileDoc, 'id'>) }));
    callback(data);
  });
}

export async function addFileDoc(data: Omit<FileDoc, 'id' | 'createdAt'>) {
  await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: Timestamp.now(),
  });
}

export async function updateFileDoc(id: string, data: Partial<FileDoc>) {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, data);
}

export async function deleteFileDoc(id: string) {
  await deleteDoc(doc(db, COLLECTION, id));
}