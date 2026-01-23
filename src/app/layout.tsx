import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Phet-ford - Évaluation interactive en physique',
  description: 'Application pédagogique pour l\'évaluation des compétences en physique - Statique, Cinématique, Ondes. Développée par Xavier Arata, B.Ing, CPI.',
  keywords: ['physique', 'statique', 'cinématique', 'ondes', 'CÉGEP', 'éducation', 'mécanique'],
  authors: [{ name: 'Xavier Arata, B.Ing, CPI' }],
  creator: 'Xavier Arata',
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
                <div className="text-center sm:text-left">
                  <p className="text-sm text-gray-500">
                    Phet-ford - Apprentissage interactif de la physique
                  </p>
                  <p className="text-sm text-gray-600 font-medium mt-1">
                    Conçu par <span className="text-gray-800">Xavier Arata, B.Ing, CPI</span>
                  </p>
                </div>
                <div className="text-center sm:text-right">
                  <p className="text-sm text-gray-400">
                    Version 2.0.0
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    © {new Date().getFullYear()} Xavier Arata. Tous droits réservés.
                  </p>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
