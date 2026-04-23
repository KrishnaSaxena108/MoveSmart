import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/components/providers'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'MoveSmart - Ship Smarter with Competitive Bidding',
    template: '%s | MoveSmart',
  },
  description: 'Connect directly with verified carriers who compete for your shipment. Save up to 35% while getting reliable, tracked delivery.',
  keywords: ['freight shipping', 'shipping marketplace', 'carrier bidding', 'load board', 'logistics'],
  authors: [{ name: 'MoveSmart' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'MoveSmart',
    title: 'MoveSmart - Ship Smarter with Competitive Bidding',
    description: 'Connect directly with verified carriers who compete for your shipment.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MoveSmart - Ship Smarter with Competitive Bidding',
    description: 'Connect directly with verified carriers who compete for your shipment.',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a2e' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        <Toaster />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
