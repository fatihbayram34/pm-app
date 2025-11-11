"use client";

import React from 'react';
import { formatTL } from '@/lib/money';

interface MoneyProps {
  value: number;
  className?: string;
}

/**
 * Para birimlerini Türk Lirası olarak biçimlendiren basit bileşen.
 */
export const Money: React.FC<MoneyProps> = ({ value, className }) => {
  return <span className={className}>{formatTL(value)}</span>;
};