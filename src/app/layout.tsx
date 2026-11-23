import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AccountProvider } from '@/lib/account-context';

export const metadata: Metadata = {
  title: 'VeraLM - The AI Model Powered by Real Human Answers',
  description:
    'Get direct AI chat replies grounded in actual, latest, human-verified answers. Free for users via sponsored ads, distributing royalties to expert bloggers and data providers.',
  keywords: [
    'AI chat',
    'verified human answers',
    'data provider royalties',
    'RAG AI model',
    'creator economy',
    'expert knowledge',
  ],
  authors: [{ name: 'VeraLM' }],
  creator: 'VeraLM',
  publisher: 'VeraLM',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://veralm.com',
    title: 'VeraLM - The AI Model Powered by Real Human Answers',
    description:
      'Get direct AI chat replies grounded in actual, latest, human-verified answers.',
    siteName: 'VeraLM',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VeraLM - The AI Model Powered by Real Human Answers',
    description:
      'Get direct AI chat replies grounded in actual, latest, human-verified answers.',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AccountProvider>
            {children}
          </AccountProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
