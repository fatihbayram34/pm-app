import './globals.css';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/ToastProvider';
import React from 'react';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Proje & Maliyet Yönetimi',
  description: 'Genel proje ve maliyet yönetimi aracı',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={`${inter.className} min-h-screen bg-gray-100 dark:bg-gray-900`}> 
        <ToastProvider>
          <header className="sticky top-0 bg-white dark:bg-gray-800 shadow z-40">
            <nav className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
              <h1 className="text-xl font-bold">Yönetim</h1>
              <ul className="flex space-x-4 text-sm">
                <li>
                  <Link href="/dashboard" className="hover:underline">
                    Ana Sayfa
                  </Link>
                </li>
                <li>
                  <Link href="/musteriler" className="hover:underline">
                    Müşteriler
                  </Link>
                </li>
                <li>
                  <Link href="/projeler" className="hover:underline">
                    Projeler
                  </Link>
                </li>
                <li>
                  <Link href="/katalog" className="hover:underline">
                    Katalog
                  </Link>
                </li>
                <li>
                  <Link href="/stok" className="hover:underline">
                    Stok
                  </Link>
                </li>
                <li>
                  <Link href="/tahsilatlar" className="hover:underline">
                    Tahsilatlar
                  </Link>
                </li>
                <li>
                  <Link href="/raporlar" className="hover:underline">
                    Raporlar
                  </Link>
                </li>
              </ul>
            </nav>
          </header>
          <main className="max-w-screen-xl mx-auto px-4 py-6">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}