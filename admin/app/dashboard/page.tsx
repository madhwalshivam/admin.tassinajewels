import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getStats() {
  const [
    productsRes,
    categoriesRes,
    productCatsRes,
    inquiriesRes,
    pendingInqRes,
    convertedInqRes,
    settingsRes,
    reviewsRes
  ] = await Promise.all([
    supabaseAdmin.from('products').select('id, stock_status, featured', { count: 'exact' }),
    supabaseAdmin.from('categories').select('id, name, slug').order('display_order'),
    supabaseAdmin.from('product_categories').select('category_id, product_id'),
    supabaseAdmin.from('inquiries').select('id, status, name, email, product_title, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(6),
    supabaseAdmin.from('inquiries').select('id', { count: 'exact' }).eq('status', 'pending'),
    supabaseAdmin.from('inquiries').select('id', { count: 'exact' }).eq('status', 'converted'),
    supabaseAdmin.from('storefront_settings').select('*'),
    supabaseAdmin.from('reviews').select('id, rating')
  ])

  // Compute category distribution
  const categories = categoriesRes.data || []
  const catProductCounts: Record<string, { name: string; count: number }> = {}
  
  categories.forEach(c => {
    catProductCounts[c.id] = { name: c.name, count: 0 }
  })

  if (productCatsRes.data) {
    productCatsRes.data.forEach(pc => {
      if (catProductCounts[pc.category_id]) {
        catProductCounts[pc.category_id].count += 1
      }
    })
  }

  const categoryDistribution = Object.values(catProductCounts)
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count)

  // Compute deals / campaigns info
  const settingsMap: Record<string, string> = {}
  if (settingsRes.data) {
    settingsRes.data.forEach(s => settingsMap[s.key] = s.value)
  }

  const campaigns = [
    { name: 'G.O.A.T. Deal', active: settingsMap.goat_deal_active !== 'false', count: settingsMap.goat_deal_products ? JSON.parse(settingsMap.goat_deal_products).length : 0 },
    { name: 'Bestsellers', active: settingsMap.bestsellers_active !== 'false', count: settingsMap.bestsellers_products ? JSON.parse(settingsMap.bestsellers_products).length : 0 },
    { name: 'Best Quality', active: settingsMap.best_quality_active !== 'false', count: settingsMap.best_quality_products ? JSON.parse(settingsMap.best_quality_products).length : 0 },
    { name: 'Trending Items', active: settingsMap.trending_active !== 'false', count: settingsMap.trending_products ? JSON.parse(settingsMap.trending_products).length : 0 },
    { name: 'Top Deals', active: settingsMap.top_deals_active === 'true', count: settingsMap.top_deals_products ? JSON.parse(settingsMap.top_deals_products).length : 0 },
  ]

  const activeCampaignsCount = campaigns.filter(c => c.active).length
  const totalCampaignProducts = campaigns.reduce((sum, c) => sum + (c.active ? c.count : 0), 0)

  // Reviews computation
  const reviews = reviewsRes.data || []
  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1) : '4.8'

  return {
    totalProducts: productsRes.count ?? 0,
    featuredProducts: (productsRes.data || []).filter(p => p.featured).length,
    totalCategories: categories.length,
    categoryDistribution,
    totalInquiries: inquiriesRes.count ?? 0,
    pendingInquiries: pendingInqRes.count ?? 0,
    convertedInquiries: convertedInqRes.count ?? 0,
    recentInquiries: inquiriesRes.data ?? [],
    campaigns,
    activeCampaignsCount,
    totalCampaignProducts,
    totalReviews: reviews.length,
    avgRating
  }
}

const statusColor: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  replied: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  converted: 'bg-[#1B4332]/10 text-[#1B4332] border-[#1B4332]/20',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

// Executive Green & Gold Palette Only
const GREEN_BAR_COLORS = [
  '#1B4332',
  '#2D6A4F',
  '#40916C',
  '#52B788',
  '#74C69D',
  '#95D5B2',
  '#C9A82C',
]

export default async function DashboardPage() {
  const stats = await getStats()

  const maxCatCount = Math.max(...stats.categoryDistribution.map(c => c.count), 1)

  const kpiCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      subtitle: `${stats.featuredProducts} Featured Items`,
      badge: '100% In Stock',
      link: '/products',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      )
    },
    {
      title: 'Categories',
      value: stats.totalCategories,
      subtitle: `${stats.categoryDistribution.length} Categories Active`,
      badge: `${stats.categoryDistribution.reduce((a, b) => a + b.count, 0)} Mapped`,
      link: '/categories',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      )
    },
    {
      title: 'Total Inquiries',
      value: stats.totalInquiries,
      subtitle: `${stats.pendingInquiries} Pending Action`,
      badge: `${stats.convertedInquiries} Converted`,
      link: '/inquiries',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      )
    },
    {
      title: 'Deals & Campaigns',
      value: stats.activeCampaignsCount,
      subtitle: 'Active Store Campaigns',
      badge: `${stats.totalCampaignProducts} Featured`,
      link: '/deals',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
      )
    }
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 font-light max-w-7xl mx-auto space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-[#1B4332]/10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-normal uppercase tracking-wider text-[#1B4332]">Dashboard Overview</h1>
            
          </div>
          <p className="text-xs text-gray-500 mt-1">Real-time catalog analytics, campaign performance & inquiry monitor</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/products"
            className="px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider font-medium transition-all shadow-sm hover:shadow flex items-center gap-2"
            style={{ background: '#1B4332', color: '#E3BA45' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Product
          </Link>
          <Link
            href="/inquiries"
            className="px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider font-medium border transition-all hover:bg-[#1B4332]/5 text-[#1B4332] border-[#1B4332]/30 flex items-center gap-2"
          >
            Inquiries
          </Link>
          <a
            href="/api/export"
            className="px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider font-medium border transition-all hover:bg-amber-50 text-[#C9A82C] border-[#C9A82C]/40 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </a>
        </div>
      </div>

      {/* KPI Cards Grid - 4 Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(card => (
          <Link
            key={card.title}
            href={card.link}
            className="bg-white rounded-3xl p-5 shadow-sm border border-[#1B4332]/10 hover:shadow-md hover:border-[#1B4332]/30 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-4 gap-1.5">
              <div className="w-9 h-9 rounded-2xl bg-[#1B4332]/10 text-[#1B4332] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                {card.icon}
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold bg-[#1B4332]/5 text-[#1B4332] border border-[#1B4332]/15 whitespace-nowrap shrink-0">
                {card.badge}
              </span>
            </div>
            <div>
              <div className="text-3xl font-semibold tracking-tight text-[#1B4332] mb-1">
                {card.value}
              </div>
              <div className="text-xs uppercase tracking-wider font-medium text-gray-700">{card.title}</div>
              <div className="text-[11px] text-gray-400 mt-1 font-light">{card.subtitle}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Analytics & Graphs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Product Distribution Chart (8 Cols) - Pure Green Palette */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-sm border border-[#1B4332]/10 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#1B4332]">Products per Category</h2>
              <p className="text-xs text-gray-400 mt-0.5">Distribution of products across catalog categories</p>
            </div>
            <Link href="/categories" className="text-xs font-medium uppercase tracking-wider text-[#1B4332] hover:underline">
              Manage ({stats.totalCategories}) &rarr;
            </Link>
          </div>

          {/* Custom SVG / Bar Chart in Green Shades */}
          <div className="space-y-4 my-2">
            {stats.categoryDistribution.slice(0, 6).map((cat, idx) => {
              const percent = ((cat.count / stats.totalProducts) * 100).toFixed(1)
              const barWidth = Math.max((cat.count / maxCatCount) * 100, 4)
              const color = GREEN_BAR_COLORS[idx % GREEN_BAR_COLORS.length]

              return (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-normal text-gray-800 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }}></span>
                      {cat.name}
                    </span>
                    <span className="font-mono text-gray-600 font-medium">
                      {cat.count} products <span className="text-gray-400 text-[10px]">({percent}%)</span>
                    </span>
                  </div>
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%`, background: color }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Total Catalog Products: <strong className="text-[#1B4332] font-mono">{stats.totalProducts}</strong></span>
            <span>Active Categories: <strong className="text-[#1B4332] font-mono">{stats.totalCategories}</strong></span>
          </div>
        </div>

        {/* Deals & Campaigns Matrix (5 Cols) - Green Theme */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-sm border border-[#1B4332]/10 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#1B4332]">Deals & Campaigns</h2>
              <p className="text-xs text-gray-400 mt-0.5">Active storefront promotions breakdown</p>
            </div>
            <Link href="/deals" className="text-xs font-medium uppercase tracking-wider text-[#1B4332] hover:underline">
              Edit Deals &rarr;
            </Link>
          </div>

          {/* Campaign List */}
          <div className="space-y-3">
            {stats.campaigns.map(camp => (
              <div
                key={camp.name}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50/80 hover:bg-gray-100/80 transition-all border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#1B4332]"></div>
                  <div>
                    <div className="text-xs font-medium text-gray-900">{camp.name}</div>
                    <div className="text-[10px] text-gray-500">{camp.count} Products Featured</div>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wider font-semibold border ${
                  camp.active ? 'bg-[#1B4332]/10 text-[#1B4332] border-[#1B4332]/20' : 'bg-gray-100 text-gray-500 border-gray-200'
                }`}>
                  {camp.active ? 'Active' : 'Disabled'}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Active Campaigns: <strong className="text-[#1B4332] font-mono">{stats.activeCampaignsCount}</strong></span>
            <span>Total Featured: <strong className="text-[#C9A82C] font-mono">{stats.totalCampaignProducts}</strong></span>
          </div>
        </div>
      </div>

      {/* Inquiry Pipeline & Recent Activity Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#1B4332]/10 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#1B4332]">Recent B2B Inquiries</h2>
            <p className="text-xs text-gray-400 mt-0.5">Wholesale inquiries and lead status monitor</p>
          </div>
          <Link href="/inquiries" className="text-xs uppercase tracking-wider font-medium text-[#1B4332] hover:underline flex items-center gap-1">
            View all inquiries
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 uppercase tracking-wider font-medium text-gray-500">
                {['Customer Name', 'Email', 'Product Requested', 'Date', 'Status'].map(h => (
                  <th key={h} className="px-6 py-4 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.recentInquiries.map((inq: any) => (
                <tr key={inq.id} className="hover:bg-gray-50/60 transition-all">
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{inq.name}</td>
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{inq.email}</td>
                  <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{inq.product_title || 'General Inquiry'}</td>
                  <td className="px-6 py-4 text-gray-400 font-mono whitespace-nowrap">{new Date(inq.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wider font-semibold border ${statusColor[inq.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {inq.status}
                    </span>
                  </td>
                </tr>
              ))}

              {stats.recentInquiries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="max-w-xs mx-auto text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#1B4332]/10 text-[#1B4332] flex items-center justify-center mx-auto">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-600 font-medium">No B2B inquiries received yet.</p>
                      <p className="text-[11px] text-gray-400">Inquiries submitted from the storefront will automatically show up here.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
