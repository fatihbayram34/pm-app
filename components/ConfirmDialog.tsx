"use client";

import React from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Basit onay diyaloğu. Açık olduğunda ekranın ortasında modal gösterir.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmText = 'Onayla',
  cancelText = 'Vazgeç',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg w-11/12 max-w-sm">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        {description && <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">{description}</p>}
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-sm"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3 py-2 rounded-xl bg-red-600 text-white text-sm"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};