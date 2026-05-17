import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NutriCalc — Calculadora Nutricional Clínica',
  description: 'Planificación nutricional con base TPCA 2023 para consultas clínicas en Perú',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PE" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
