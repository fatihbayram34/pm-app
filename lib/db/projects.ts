import { collection, doc, onSnapshot, query, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import { db } from '../firebaseClient';
import { calcAnlasma } from '../kdv';

const COLLECTION = 'projects';

// Project durum enum'u
export const ProjectStatusEnum = z.union([
  z.literal('Teklif'),
  z.literal('Devam'),
  z.literal('Beklemede'),
  z.literal('Tamamlandı'),
  z.literal('İptal'),
]);

export const ProjectSchema = z.object({
  id: z.string().optional(),
  musteri_id: z.string().min(1),
  ad: z.string().min(1, 'Proje adı gerekli'),
  il: z.string().optional(),
  ilce: z.string().optional(),
  konum: z.string().optional(),
  baslangic: z.any(),
  bitis: z.any().optional(),
  durum: ProjectStatusEnum,
  anlasma_net: z.number().nonnegative(),
  kdv_oran: z.number().default(0.2),
  anlasma_kdv: z.number().nonnegative().optional(),
  anlasma_brut: z.number().nonnegative().optional(),
  aciklama: z.string().optional(),
  etiketler: z.array(z.string()).optional(),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

// Subscribe to live projects
export function subscribeProjects(callback: (projects: Project[]) => void) {
  const q = query(collection(db, COLLECTION));
  return onSnapshot(q, (snap) => {
    const data: Project[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Project, 'id'>),
    }));
    callback(data);
  });
}

// Add project; computes KDV and brüt automatically
export async function addProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'anlasma_kdv' | 'anlasma_brut'>) {
  const { net, kdv, brut } = calcAnlasma({ net: data.anlasma_net, kdv_oran: data.kdv_oran });
  const now = Timestamp.now();
  await addDoc(collection(db, COLLECTION), {
    ...data,
    anlasma_net: net,
    anlasma_kdv: kdv,
    anlasma_brut: brut,
    createdAt: now,
    updatedAt: now,
  });
}

// Update project
export async function updateProject(id: string, data: Partial<Project>) {
  const ref = doc(db, COLLECTION, id);
  let updateData: any = { ...data, updatedAt: Timestamp.now() };
  if (data.anlasma_net !== undefined || data.kdv_oran !== undefined) {
    const net = data.anlasma_net ?? 0;
    const kdvOran = data.kdv_oran ?? 0.2;
    const { kdv, brut } = calcAnlasma({ net, kdv_oran: kdvOran });
    updateData = { ...updateData, anlasma_kdv: kdv, anlasma_brut: brut };
  }
  await updateDoc(ref, updateData);
}

// Delete project
export async function deleteProject(id: string) {
  await deleteDoc(doc(db, COLLECTION, id));
}