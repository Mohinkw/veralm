import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import '@/styles/globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AccountProvider } from '@/lib/account-context';
import { getSiteUrl } from '@/lib/utils';

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'VeraLM - The Frontier AI Model Powered by Real Human Knowledge',
    template: '%s | VeraLM',
  },
  description:
    'Get direct AI model intelligence grounded in actual, latest, human-verified creator publications. Distributing royalties to expert bloggers and knowledge creators.',
  keywords: [
    'AI model',
    'VeraLM AI model',
    'grounded AI model',
    'verified human knowledge',
    'creator royalties',
    'RAG AI model',
    'creator economy',
    'expert knowledge base',
    'human-trained AI',
  ],
  authors: [{ name: 'VeraLM', url: siteUrl }],
  creator: 'VeraLM',
  publisher: 'VeraLM',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: 'VeraLM',
        description: 'The AI Model Powered by Real Human Answers',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteUrl}/?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'VeraLM',
        url: siteUrl,
        logo: `${siteUrl}/icon.png`,
        sameAs: ['https://twitter.com/veralm'],
      },
    ],
  };

  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
        {gaMeasurementId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaMeasurementId}', { page_path: window.location.pathname });`}
            </Script>
          </>
        )}
        {adsenseClientId && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
