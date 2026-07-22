import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getStats() {
  const [products, inquiries] = await Promise.all([
    supabaseAdmin.from('products').select('id', { count: 'exact' }),
    supabaseAdmin.from('inquiries').select('id, status, name, email, product_title, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(5),
  ])
  const [pending, converted] = await Promise.all([
    supabaseAdmin.from('inquiries').select('id', { count: 'exact' }).eq('status', 'pending'),
    supabaseAdmin.from('inquiries').select('id', { count: 'exact' }).eq('status', 'converted'),
  ])
  return {
    totalProducts: products.count ?? 0,
    totalInquiries: inquiries.count ?? 0,
    pendingInquiries: pending.count ?? 0,
    converted: converted.count ?? 0,
    recentInquiries: inquiries.data ?? [],
  }
}

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  replied: 'bg-blue-50 text-blue-700 border-blue-100',
  converted: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  cancelled: 'bg-red-50 text-red-700 border-red-100',
}

export default async function DashboardPage() {
  const stats = await getStats()

  const statCards = [
    {
      label: 'Total Products',
      value: stats.totalProducts,
      color: '#1B4332',
      bgColor: '#1B43320a',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      label: 'Total Inquiries',
      value: stats.totalInquiries,
      color: '#2563EB',
      bgColor: '#2563EB0a',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      label: 'Pending Reviews',
      value: stats.pendingInquiries,
      color: '#D97706',
      bgColor: '#D977060a',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: 'Converted Orders',
      value: stats.converted,
      color: '#059669',
      bgColor: '#0596690a',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ]

  return (
    <div className="p-4 md:p-8 font-light max-w-6xl mx-auto">
      {/* Welcome Title */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-light uppercase tracking-wide" style={{ color: '#1B4332' }}>Dashboard</h1>
          <p className="text-xs text-gray-500 mt-1">Real-time statistics & activity monitor</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-2xl font-normal tracking-tight mb-1" style={{ color: card.color }}>
                {card.value}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">{card.label}</div>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.bgColor, color: card.color }}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Action Panel */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 items-start sm:items-center justify-between">
        <div className="text-xs text-gray-500 uppercase tracking-wider font-medium shrink-0">Quick Actions</div>
        <div className="flex flex-col xs:flex-row flex-wrap gap-2 w-full sm:w-auto">
          <Link href="/products" className="px-4 py-3 sm:py-2.5 rounded-xl text-xs uppercase tracking-wider font-normal transition-all flex items-center justify-center gap-1.5 min-h-[44px]" style={{ background: '#1B4332', color: '#E3BA45' }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
            Add Product
          </Link>
          <Link href="/inquiries" className="px-4 py-3 sm:py-2.5 rounded-xl text-xs uppercase tracking-wider font-normal border transition-all hover:bg-gray-50 flex items-center justify-center min-h-[44px]" style={{ borderColor: '#1B4332', color: '#1B4332' }}>
            View Inquiries
          </Link>
          <a href="/api/export" className="px-4 py-3 sm:py-2.5 rounded-xl text-xs uppercase tracking-wider font-normal border transition-all hover:bg-gray-50 flex items-center justify-center min-h-[44px]" style={{ borderColor: '#E3BA45', color: '#C9A82C' }}>
            Export CSV
          </a>
        </div>
      </div>

      {/* Recent Inquiries List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-sm font-normal uppercase tracking-wider" style={{ color: '#1B4332' }}>Recent Inquiries</h2>
          <Link href="/inquiries" className="text-xs uppercase tracking-wider font-normal text-yellow-600 hover:text-yellow-700 flex items-center gap-1">
            View all
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
        <div className="overflow-x-auto w-full">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 uppercase tracking-wider font-normal text-gray-500">
                  {['Name', 'Email', 'Product', 'Date', 'Status'].map(h => (
                    <th key={h} className="px-6 py-4 text-left font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recentInquiries.map((inq: any) => (
                  <tr key={inq.id} className="border-b border-gray-50 hover:bg-gray-50 transition-all">
                    <td className="px-6 py-4 font-normal whitespace-nowrap" style={{ color: '#1B4332' }}>{inq.name}</td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{inq.email}</td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{inq.product_title || '—'}</td>
                    <td className="px-6 py-4 text-gray-400 font-mono whitespace-nowrap">{new Date(inq.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold border ${statusColor[inq.status] || 'bg-gray-100 text-gray-600'}`}>
                        {inq.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {stats.recentInquiries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No inquiries received yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
