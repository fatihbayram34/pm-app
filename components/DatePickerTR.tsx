"use client";

import React from 'react';
import dayjs from '@/lib/date';

interface DatePickerTRProps {
  value?: Date | string;
  onChange: (value: Date) => void;
  className?: string;
  id?: string;
  name?: string;
}

/**
 * Basit bir tarih seçici. HTML5 `<input type="date">` kullanır ve
 * GG.AA.YYYY formatını dayjs ile yönetir.
 */
export const DatePickerTR: React.FC<DatePickerTRProps> = ({ value, onChange, className, id, name }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const dt = dayjs(val, 'YYYY-MM-DD').toDate();
    onChange(dt);
  };
  const formatted = value ? dayjs(value).format('YYYY-MM-DD') : '';
  return (
    <input
      id={id}
      name={name}
      type="date"
      className={className}
      value={formatted}
      onChange={handleChange}
    />
  );
};