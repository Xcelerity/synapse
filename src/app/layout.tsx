import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';

export const metadata: Metadata = {
  title: 'Synapse',
  description: 'Synapse: Your Best Friend. From K-12 to PhD, Synapse adapts to your level with smart flashcards, Socratic tutors, research agents, and more.',
  keywords: 'study app, tutor, flashcards, spaced repetition, note taking, student productivity',
  openGraph: {
    title: 'Synapse',
    description: 'Your Best Friend',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <ToastProvider />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
