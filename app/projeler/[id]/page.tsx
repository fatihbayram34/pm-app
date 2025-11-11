"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { subscribeProjects, Project, updateProject } from '@/lib/db/projects';
import { subscribeExpenses, Expense, addExpense } from '@/lib/db/expenses';
import { subscribeLabors, Labor, addLabor } from '@/lib/db/labors';
import { subscribeLedger, LedgerDoc, addLedgerDoc } from '@/lib/db/ledger';
import { subscribeChecklists, Checklist, addChecklistItem, updateChecklistItem } from '@/lib/db/checklists';
import { subscribeFiles, FileDoc, addFileDoc } from '@/lib/db/files';
import { projectCostNet } from '@/lib/agg';
import { Money } from '@/components/Money';
import { ChecklistItem } from '@/components/ChecklistItem';
import { UploadButton } from '@/components/UploadButton';
import { useToast } from '@/components/ToastProvider';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LedgerSchema } from '@/lib/db/ledger';
import { CatalogItem, subscribeCatalog } from '@/lib/db/catalog';
import { ExpenseSchema } from '@/lib/db/expenses';
import { LaborSchema } from '@/lib/db/labors';
import dayjs from '@/lib/date';

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<Project | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [labors, setLabors] = useState<Labor[]>([]);
  const [ledger, setLedger] = useState<LedgerDoc[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [files, setFiles] = useState<FileDoc[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'summary' | 'checklist' | 'expenses' | 'labors' | 'materials' | 'documents'>('summary');

  useEffect(() => {
    const unsubProj = subscribeProjects((data) => {
      const found = data.find((p) => p.id === projectId);
      setProject(found ?? null);
    });
    const unsubExp = subscribeExpenses((data) => setExpenses(data.filter((e) => e.proje_id === projectId)));
    const unsubLab = subscribeLabors((data) => setLabors(data.filter((l) => l.proje_id === projectId)));
    const unsubLed = subscribeLedger((data) => setLedger(data.filter((d) => d.proje_id === projectId)));
    const unsubChk = subscribeChecklists((data) => setChecklists(data.filter((c) => c.proje_id === projectId)));
    const unsubFiles = subscribeFiles((data) => setFiles(data.filter((f) => f.proje_id === projectId)));
    const unsubCat = subscribeCatalog((data) => setCatalog(data));
    return () => {
      unsubProj();
      unsubExp();
      unsubLab();
      unsubLed();
      unsubChk();
      unsubFiles();
      unsubCat();
    };
  }, [projectId]);

  if (!project) {
    return <p>Yükleniyor...</p>;
  }

  // Compute cost and profit for project
  const stockOut = stockOutByProject[id] ?? 0;
const costNet = projectCostNet(
  expensesForThisProject,
  laborsForThisProject,
  stockOut
);
const profitNet = project.anlasma_net - costNet;
// Ekranda: Anlaşma Net, Maliyet Net (costNet), Brüt Kâr (net) = profitNet


  // Expense form for adding new expense
  const expenseForm = useForm<any>({ resolver: zodResolver(ExpenseSchema as any), defaultValues: { proje_id: projectId, tarih: new Date(), kategori: '', tutar_net: 0 } });
  const handleAddExpense = expenseForm.handleSubmit(async (values) => {
    try {
      await addExpense({ ...values, proje_id: projectId });
      showToast('Gider eklendi', 'success');
      expenseForm.reset({ proje_id: projectId, tarih: new Date() });
    } catch (err) {
      showToast('Gider eklenemedi', 'error');
    }
  });

  // Labor form
  const laborForm = useForm<any>({ resolver: zodResolver(LaborSchema as any), defaultValues: { proje_id: projectId, tarih: new Date(), personel: '', tutar_net: 0 } });
  const handleAddLabor = laborForm.handleSubmit(async (values) => {
    try {
      await addLabor({ ...values, proje_id: projectId });
      showToast('İşçilik eklendi', 'success');
      laborForm.reset({ proje_id: projectId, tarih: new Date() });
    } catch (err) {
      showToast('İşçilik eklenemedi', 'error');
    }
  });

  // Material (stock) form: we reuse StockDocForm but we need to adapt; simplified: use our own form
  const stockForm = useForm<any>({ resolver: zodResolver(LedgerSchema as any), defaultValues: { tarih: new Date(), tip: 'giris', konum: 'santiye', owner_musteri_id: project.musteri_id, proje_id: projectId, satirlar: [] } });
  const { fields: stockFields, append: stockAppend, remove: stockRemove } = useFieldArray({ control: stockForm.control, name: 'satirlar' });
  const handleAddStock = stockForm.handleSubmit(async (values) => {
    try {
      await addLedgerDoc({ ...values, proje_id: projectId });
      showToast('Stok belgesi kaydedildi', 'success');
      stockForm.reset({ tarih: new Date(), tip: 'giris', konum: 'santiye', owner_musteri_id: project.musteri_id, proje_id: projectId, satirlar: [] });
    } catch (err) {
      showToast('Stok belgesi eklenemedi', 'error');
    }
  });

  // Checklist
  const handleToggleChecklist = async (id: string, newStatus: 'Açık' | 'Kapalı') => {
    try {
      await updateChecklistItem(id, { durum: newStatus });
      showToast('Durum güncellendi', 'success');
    } catch (err) {
      showToast('Güncelleme hatası', 'error');
    }
  };
  const checklistForm = useForm<{ baslik: string }>({ defaultValues: { baslik: '' } });
  const handleAddChecklist = checklistForm.handleSubmit(async (values) => {
    try {
      await addChecklistItem({ proje_id: projectId, baslik: values.baslik, durum: 'Açık', tarih: new Date() });
      showToast('Madde eklendi', 'success');
      checklistForm.reset();
    } catch (err) {
      showToast('Madde eklenemedi', 'error');
    }
  });

  // File upload
  const handleUpload = async (url: string) => {
    try {
      await addFileDoc({ proje_id: projectId, tip: 'foto', url, tarih: new Date() });
      showToast('Dosya yüklendi', 'success');
    } catch (err) {
      showToast('Dosya yüklenemedi', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Proje Detayı: {project.ad}</h2>
      <div className="flex space-x-4 overflow-x-auto">
        {(
          [
            { key: 'summary', label: 'Özet' },
            { key: 'checklist', label: 'Checklist' },
            { key: 'expenses', label: 'Masraflar' },
            { key: 'labors', label: 'İşçilik' },
            { key: 'materials', label: 'Malzeme' },
            { key: 'documents', label: 'Belgeler' },
          ] as { key: typeof activeTab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-2 rounded-xl text-sm ${activeTab === t.key ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow">
              <h3 className="text-sm font-medium mb-1">Anlaşma Net / Brüt</h3>
              <p className="text-lg font-bold">
                <Money value={project.anlasma_net} /> / <Money value={project.anlasma_brut ?? 0} />
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow">
              <h3 className="text-sm font-medium mb-1">Maliyet Net</h3>
              <Money value={maliyet_net} className="text-lg font-bold" />
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow">
              <h3 className="text-sm font-medium mb-1">Brüt Kâr (Net)</h3>
              <Money value={kar_net} className="text-lg font-bold" />
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow">
              <h3 className="text-sm font-medium mb-1">İl / İlçe</h3>
              <p>{project.il ?? '-'} / {project.ilce ?? '-'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow">
              <h3 className="text-sm font-medium mb-1">Durum</h3>
              <p>{project.durum}</p>
            </div>
          </div>
          {project.aciklama && (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow">
              <h3 className="text-sm font-medium mb-1">Açıklama</h3>
              <p>{project.aciklama}</p>
            </div>
          )}
        </div>
      )}
      {activeTab === 'checklist' && (
        <div className="space-y-4">
          <form onSubmit={handleAddChecklist} className="flex space-x-2">
            <input type="text" {...checklistForm.register('baslik')} placeholder="Yeni madde" className="flex-1 border rounded-lg p-2" />
            <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm">
              Ekle
            </button>
          </form>
          {checklists.length === 0 ? (
            <p>Henüz madde yok.</p>) : (
            checklists.map((item) => (
              <ChecklistItem key={item.id} item={item} onToggle={handleToggleChecklist} />
            ))
          )}
        </div>
      )}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Masraf Ekle</h3>
          <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm">Tarih</label>
              <input type="date" {...expenseForm.register('tarih')} className="border rounded-lg p-2" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm">Kategori</label>
              <input type="text" {...expenseForm.register('kategori')} className="border rounded-lg p-2" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm">Net Tutar</label>
              <input type="number" step="0.01" {...expenseForm.register('tutar_net', { valueAsNumber: true })} className="border rounded-lg p-2" />
            </div>
            <div className="flex items-end">
              <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm">
                Kaydet
              </button>
            </div>
          </form>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-200 dark:bg-gray-700">
                <th className="px-3 py-2 text-left">Tarih</th>
                <th className="px-3 py-2 text-left">Kategori</th>
                <th className="px-3 py-2 text-right">Tutar (Net)</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b dark:border-gray-700">
                  <td className="px-3 py-2">{dayjs(e.tarih.toDate ? e.tarih.toDate() : e.tarih).format('DD.MM.YYYY')}</td>
                  <td className="px-3 py-2">{e.kategori}</td>
                  <td className="px-3 py-2 text-right"><Money value={e.tutar_net} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {activeTab === 'labors' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">İşçilik Ekle</h3>
          <form onSubmit={handleAddLabor} className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm">Tarih</label>
              <input type="date" {...laborForm.register('tarih')} className="border rounded-lg p-2" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm">Personel</label>
              <input type="text" {...laborForm.register('personel')} className="border rounded-lg p-2" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm">Net Tutar</label>
              <input type="number" step="0.01" {...laborForm.register('tutar_net', { valueAsNumber: true })} className="border rounded-lg p-2" />
            </div>
            <div className="flex items-end">
              <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm">
                Kaydet
              </button>
            </div>
          </form>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-200 dark:bg-gray-700">
                <th className="px-3 py-2 text-left">Tarih</th>
                <th className="px-3 py-2 text-left">Personel</th>
                <th className="px-3 py-2 text-right">Net Tutar</th>
              </tr>
            </thead>
            <tbody>
              {labors.map((l) => (
                <tr key={l.id} className="border-b dark:border-gray-700">
                  <td className="px-3 py-2">{dayjs(l.tarih.toDate ? l.tarih.toDate() : l.tarih).format('DD.MM.YYYY')}</td>
                  <td className="px-3 py-2">{l.personel}</td>
                  <td className="px-3 py-2 text-right"><Money value={l.tutar_net} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Malzeme Giriş/Çıkış</h3>
          <form onSubmit={handleAddStock} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm">Tarih</label>
                <input type="datetime-local" {...stockForm.register('tarih')} className="border rounded-lg p-2" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm">Tip</label>
                <select {...stockForm.register('tip')} className="border rounded-lg p-2">
                  <option value="giris">Giriş</option>
                  <option value="cikis">Çıkış</option>
                  <option value="iade">İade</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm">Konum</label>
                <select {...stockForm.register('konum')} className="border rounded-lg p-2">
                  <option value="santiye">Şantiye</option>
                  <option value="depo">Depo</option>
                </select>
              </div>
            </div>
            {/* Satırlar */}
            <div className="space-y-2">
              {stockFields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-center">
                  <select
                    {...stockForm.register(`satirlar.${index}.katalog_id` as const)}
                    className="border rounded-lg p-2 flex-1"
                  >
                    {catalog.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.kod} – {c.ad}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    {...stockForm.register(`satirlar.${index}.miktar` as const, { valueAsNumber: true })}
                    className="border rounded-lg p-2 w-28"
                    placeholder="Miktar"
                  />
                  <input
                    type="text"
                    {...stockForm.register(`satirlar.${index}.birim` as const)}
                    className="border rounded-lg p-2 w-20"
                    placeholder="Birim"
                    disabled
                  />
                  <button type="button" onClick={() => stockRemove(index)} className="text-red-600 px-2">
                    Sil
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => stockAppend({ katalog_id: catalog[0]?.id ?? '', miktar: 0, birim: catalog[0]?.birim as any })}
                className="px-3 py-2 bg-gray-200 rounded-xl text-sm"
              >
                Satır Ekle
              </button>
            </div>
            <div className="flex justify-end mt-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">
                Kaydet
              </button>
            </div>
          </form>
          {/* List existing ledger rows */}
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-200 dark:bg-gray-700">
                <th className="px-3 py-2">Tarih</th>
                <th className="px-3 py-2">Tip</th>
                <th className="px-3 py-2">Konum</th>
                <th className="px-3 py-2">Satırlar</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((d) => (
                <tr key={d.id} className="border-b dark:border-gray-700">
                  <td className="px-3 py-2">{dayjs(d.tarih.toDate ? d.tarih.toDate() : d.tarih).format('DD.MM.YYYY HH:mm')}</td>
                  <td className="px-3 py-2">{d.tip}</td>
                  <td className="px-3 py-2">{d.konum}</td>
                  <td className="px-3 py-2 text-sm">
                    {d.satirlar.map((row, idx) => (
                      <div key={idx}>
                        {row.katalog_id}: {row.miktar} {row.birim}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Dosya Yükle</h3>
          <UploadButton folder={`projects/${projectId}`} onUploaded={handleUpload} />
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-200 dark:bg-gray-700">
                <th className="px-3 py-2">Tarih</th>
                <th className="px-3 py-2">Tip</th>
                <th className="px-3 py-2">Dosya</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id} className="border-b dark:border-gray-700">
                  <td className="px-3 py-2">{dayjs(f.tarih.toDate ? f.tarih.toDate() : f.tarih).format('DD.MM.YYYY HH:mm')}</td>
                  <td className="px-3 py-2">{f.tip}</td>
                  <td className="px-3 py-2">
                    <a href={f.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      Dosya
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
