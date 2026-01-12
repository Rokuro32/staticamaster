import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'StaticaMaster - Évaluation interactive en statique',
  description: 'Application pédagogique pour l\'évaluation des compétences en statique - Cours 203-4A3-RA',
  keywords: ['statique', 'mécanique', 'CÉGEP', 'éducation', 'physique', 'équilibre'],
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
          {/* Header */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                {/* Logo et titre */}
                <div className="flex items-center">
                  <a href="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-gray-900">StaticaMaster</h1>
                      <p className="text-xs text-gray-500">203-4A3-RA</p>
                    </div>
                  </a>
                </div>

                {/* Navigation principale */}
                <div className="hidden sm:flex sm:items-center sm:gap-6">
                  <a
                    href="/modules"
                    className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
                  >
                    Modules
                  </a>
                  <a
                    href="/progress"
                    className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
                  >
                    Progression
                  </a>
                  <a
                    href="/teacher"
                    className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
                  >
                    Enseignant
                  </a>
                </div>

                {/* Menu mobile */}
                <div className="flex items-center sm:hidden">
                  <button
                    type="button"
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    aria-label="Menu"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </nav>
          </header>

          {/* Contenu principal */}
          <main className="flex-1">{children}</main>

          {/* Footer */}
          <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm text-gray-500">
                  StaticaMaster - Cours 203-4A3-RA - Techniques de génie du plastique
                </p>
                <p className="text-sm text-gray-400">
                  Version 1.0.0
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
