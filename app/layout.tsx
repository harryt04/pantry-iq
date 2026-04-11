import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { PostHogProvider } from '@/providers/posthogProvider'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'PantryIQ',
  description:
    'PantryIQ uses AI to help restaurants reduce food waste by analyzing transaction data and answering questions about staffing, inventory, menu optimization, and donation opportunities.',
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Light mode favicons (dark icon on white) */}
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-light/favicon-16x16.png"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-light/favicon-32x32.png"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-icon"
          href="/favicon-light/apple-touch-icon.png"
          media="(prefers-color-scheme: light)"
        />
        {/* Dark mode favicons (white icon on dark) */}
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon/favicon-16x16.png"
          media="(prefers-color-scheme: dark)"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon/favicon-32x32.png"
          media="(prefers-color-scheme: dark)"
        />
        <link
          rel="apple-touch-icon"
          href="/favicon/apple-touch-icon.png"
          media="(prefers-color-scheme: dark)"
        />
      </head>
      <PostHogProvider>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
        </body>
      </PostHogProvider>
    </html>
  )
}
