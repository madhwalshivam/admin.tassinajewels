import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NotificationProvider } from '@/components/NotificationProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Tassina Jewels — Admin',
  description: 'B2B wholesale jewelry admin panel',
  icons: {
    icon: '/logo.jpg',
    shortcut: '/logo.jpg',
    apple: '/logo.jpg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  )
}
