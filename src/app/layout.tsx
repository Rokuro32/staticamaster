import type { Metadata } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display-face',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-face',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Phet-ford — Simulations interactives de physique',
  description:
    'Une collection de simulations de physique à manipuler dans le navigateur : mathématiques, statique, cinématique, mécanismes, ondes, électricité, physique moderne et nucléaire. Développée par Xavier Arata, B.Ing, CPI.',
  keywords: [
    'simulation',
    'physique',
    'interactif',
    'statique',
    'cinématique',
    'ondes',
    'électricité',
    'physique moderne',
    'CÉGEP',
  ],
  authors: [{ name: 'Xavier Arata, B.Ing, CPI' }],
  creator: 'Xavier Arata',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${display.variable} ${mono.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#05080f" />
      </head>
      <body className="font-sans">
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
