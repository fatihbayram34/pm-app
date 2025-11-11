"use client";

import React from 'react';
import { Project } from '@/lib/db/projects';

interface Props {
  status: Project['durum'];
  className?: string;
}

const statusClasses: Record<Project['durum'], string> = {
  Teklif: 'bg-yellow-100 text-yellow-800',
  Devam: 'bg-green-100 text-green-800',
  Beklemede: 'bg-purple-100 text-purple-800',
  Tamamlandı: 'bg-blue-100 text-blue-800',
  İptal: 'bg-red-100 text-red-800',
};

/**
 * Proje durumları için rozet bileşeni.
 */
export const StatusBadge: React.FC<Props> = ({ status, className }) => {
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status]} ${className || ''}`}
    >
      {status}
    </span>
  );
};