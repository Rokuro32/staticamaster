import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Phet-ford - Évaluation interactive en physique',
  description: 'Application pédagogique pour l\'évaluation des compétences en physique - Statique, Cinématique, Ondes',
  keywords: ['physique', 'statique', 'cinématique', 'ondes', 'CÉGEP', 'éducation', 'mécanique'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          {/* Header dynamique */}
          <Header />

          {/* Contenu principal */}
          <main className="flex-1">{children}</main>

          {/* Footer */}
          <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm text-gray-500">
                  Phet-ford - Apprentissage interactif de la physique
                </p>
                <p className="text-sm text-gray-400">
                  Version 2.0.0
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
