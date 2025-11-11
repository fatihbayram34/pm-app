import { collection, doc, onSnapshot, query, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import { db } from '../firebaseClient';

// Firestore collection name
const COLLECTION = 'customers';

/**
 * Zod şeması: cari (customer) nesnesini tanımlar.
 */
export const CustomerSchema = z.object({
  id: z.string().optional(),
  unvan: z.string().min(1, 'Unvan gerekli'),
  vergi_no: z.string().optional(),
  iletisim: z
    .object({
      tel: z.string().optional(),
      eposta: z.string().optional(),
      kisi: z.string().optional(),
    })
    .optional(),
  adres: z.string().optional(),
  etiketler: z.array(z.string()).optional(),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
});

export type Customer = z.infer<typeof CustomerSchema>;

/**
 * Cari listesini canlı olarak döndürür. onSnapshot ile abonelik.
 */
export function subscribeCustomers(callback: (customers: Customer[]) => void) {
  const q = query(collection(db, COLLECTION));
  return onSnapshot(q, (snap) => {
    const data: Customer[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Customer, 'id'>),
    }));
    callback(data);
  });
}

/** Yeni cari ekler */
export async function addCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = Timestamp.now();
  await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
}

/** Cari güncelle */
export async function updateCustomer(id: string, data: Partial<Customer>) {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/** Cari sil */
export async function deleteCustomer(id: string) {
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
}