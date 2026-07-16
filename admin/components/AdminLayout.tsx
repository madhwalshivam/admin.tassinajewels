'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

const titleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/products': 'Products',
  '/inquiries': 'Inquiries',
  '/categories': 'Categories',
  '/navigation': 'Navigation Menu',
  '/filters': 'Filters',
  '/deals': 'Deals & Campaigns',
  '/settings': 'Storefront',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Match active path in titleMap
  let title = 'Admin Portal'
  for (const [route, label] of Object.entries(titleMap)) {
    if (pathname === route || pathname?.startsWith(route + '/')) {
      title = label
      break
    }
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full" style={{ background: '#f8f5f0' }}>
      {/* Mobile Top Header */}
      <header 
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#1B4332] text-white md:hidden border-b border-[rgba(227,186,69,0.15)] shrink-0"
      >
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-lg text-[#E3BA45] hover:bg-emerald-950 focus:outline-none"
          aria-label="Open navigation menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-sm font-normal uppercase tracking-wider text-[#E3BA45]">{title}</h1>
        <div className="w-8 h-8 rounded-full overflow-hidden border border-yellow-400 shrink-0">
          <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
        </div>
      </header>

      {/* Sidebar drawer and desktop sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto w-full min-h-0">{children}</main>
    </div>
  )
}
