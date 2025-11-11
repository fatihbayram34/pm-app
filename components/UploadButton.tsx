"use client";

import React, { useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebaseClient';

interface Props {
  folder: string;
  onUploaded: (url: string) => void;
}

/**
 * Firebase Storage'a dosya yüklemek için basit buton.
 * Yükleme tamamlanınca URL'i döner.
 */
export const UploadButton: React.FC<Props> = ({ folder, onUploaded }) => {
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);
      uploadTask.on('state_changed', null, (error) => {
        console.error(error);
      }, async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        onUploaded(url);
        setUploading(false);
      });
    } catch (err) {
      console.error(err);
      setUploading(false);
    }
  };

  return (
    <label className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl cursor-pointer">
      {uploading ? 'Yükleniyor...' : 'Dosya Yükle'}
      <input type="file" className="hidden" onChange={handleChange} />
    </label>
  );
};