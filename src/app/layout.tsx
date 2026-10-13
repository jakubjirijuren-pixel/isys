import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata: Metadata = { title: 'iSYS', description: 'Správa bytových domů' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="cs"><body><header><Link href="/">iSYS</Link><nav><Link href="/">Přehled</Link><Link href="/buildings">Objekty</Link></nav></header><main>{children}</main></body></html>;
}
