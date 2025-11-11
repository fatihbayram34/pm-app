import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import { db } from '../firebaseClient';

const COLLECTION = 'catalog';

export const UnitEnum = z.union([
  z.literal('Adet'),
  z.literal('Metre'),
  z.literal('Kg'),
  z.literal('Rulo'),
  z.literal('Set'),
  z.literal('Diğer'),
]);

export const CatalogSchema = z.object({
  id: z.string().optional(),
  kod: z.string().min(1),
  ad: z.string().min(1),
  birim: UnitEnum,
  kategoriler: z.array(z.string()).optional(),
  tanim: z.string().optional(),
  son_birim_maliyet_net: z.number().optional(),
  ortalama_maliyet_net: z.number().optional(),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
});

export type CatalogItem = z.infer<typeof CatalogSchema>;

export function subscribeCatalog(callback: (items: CatalogItem[]) => void) {
  const q = query(collection(db, COLLECTION));
  return onSnapshot(q, (snap) => {
    const data: CatalogItem[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CatalogItem, 'id'>) }));
    callback(data);
  });
}

export async function addCatalogItem(data: Omit<CatalogItem, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = Timestamp.now();
  await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateCatalogItem(id: string, data: Partial<CatalogItem>) {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, { ...data, updatedAt: Timestamp.now() });
}

export async function deleteCatalogItem(id: string) {
  await deleteDoc(doc(db, COLLECTION, id));
}