"use client";

import React from 'react';
import { Checklist } from '@/lib/db/checklists';

interface Props {
  item: Checklist;
  onToggle: (id: string, newStatus: 'Açık' | 'Kapalı') => void;
}

/**
 * Checklist maddesi. Durumu değiştirmek için tıklanabilir.
 */
export const ChecklistItem: React.FC<Props> = ({ item, onToggle }) => {
  const handleClick = () => {
    const newStatus = item.durum === 'Açık' ? 'Kapalı' : 'Açık';
    onToggle(item.id!, newStatus);
  };
  return (
    <div
      className="flex items-center justify-between p-2 border rounded-xl mb-1 cursor-pointer"
      onClick={handleClick}
    >
      <div>
        <p className="font-medium">{item.baslik}</p>
        {item.not && <p className="text-xs text-gray-500">{item.not}</p>}
      </div>
      <span
        className={`px-2 py-1 rounded-full text-xs ${
          item.durum === 'Açık' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
        }`}
      >
        {item.durum}
      </span>
    </div>
  );
};