import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'English Academy — Level Assessment',
  description: 'ทดสอบวัดระดับภาษาอังกฤษ / English Level Assessment',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={geist.variable}>
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
