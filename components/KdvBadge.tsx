"use client";

import React from 'react';

interface KdvBadgeProps {
  oran: number;
  className?: string;
}

/**
 * KDV oranı için etiket. Oranı yüzde olarak gösterir (örneğin %20).
 */
export const KdvBadge: React.FC<KdvBadgeProps> = ({ oran, className }) => {
  const percent = (oran * 100).toFixed(0);
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ${className || ''}`}
    >
      %{percent} KDV
    </span>
  );
};