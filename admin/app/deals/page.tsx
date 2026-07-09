'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Product {
  id: string
  title: string
  price: number
  sku: string
}

interface Category {
  id: string
  name: string
  slug: string
}

export default function DealsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState<Product[]>([])

  const [settings, setSettings] = useState({
    goat_deal_active: 'true',
    goat_deal_products: '[]',
    goat_deal_more_url: '',
    goat_deal_title: 'G.O.A.T. Deal',
    
    top_deals_active: 'true',
    top_deals_products: '[]',
    top_deals_more_url: '',
    top_deals_title: 'Top Deals',

    best_quality_active: 'true',
    best_quality_products: '[]',
    best_quality_more_url: '',
    best_quality_title: 'Best Quality',

    shop_by_cat_active: 'true',
    shop_by_cat_title: 'Shop by Category',

    trending_active: 'true',
    trending_title: 'Trending Items',
    trending_products: '[]',
  })

  // Selected product lists for UI
  const [selectedGoatIds, setSelectedGoatIds] = useState<string[]>([])
  const [selectedTopIds, setSelectedTopIds] = useState<string[]>([])
  const [selectedQualityIds, setSelectedQualityIds] = useState<string[]>([])
  const [selectedTrendingIds, setSelectedTrendingIds] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCatSlugs, setSelectedCatSlugs] = useState<string[]>([])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      // Load products for dropdown selection
      const { data: prodData } = await supabase.from('products').select('id, title, price, sku').order('title')
      if (prodData) setProducts(prodData)

      // Load categories for the Shop by Category selector
      const { data: catData } = await supabase.from('categories').select('id, name, slug').order('display_order')
      if (catData) setCategories(catData)

      // Load current storefront settings
      const { data: settingsData } = await supabase.from('storefront_settings').select('*')
      if (settingsData) {
        const m: any = {}
        settingsData.forEach((r: any) => { m[r.key] = r.value })

        const newSettings = {
          goat_deal_active: m.goat_deal_active || 'true',
          goat_deal_products: m.goat_deal_products || '[]',
          goat_deal_more_url: m.goat_deal_more_url || '',
          goat_deal_title: m.goat_deal_title || 'G.O.A.T. Deal',
          
          top_deals_active: m.top_deals_active || 'true',
          top_deals_products: m.top_deals_products || '[]',
          top_deals_more_url: m.top_deals_more_url || '',
          top_deals_title: m.top_deals_title || 'Top Deals',

          best_quality_active: m.best_quality_active || 'true',
          best_quality_products: m.best_quality_products || '[]',
          best_quality_more_url: m.best_quality_more_url || '',
          best_quality_title: m.best_quality_title || 'Best Quality',

          shop_by_cat_active: m.shop_by_cat_active || 'true',
          shop_by_cat_title: m.shop_by_cat_title || 'Shop by Category',
          shop_by_cat_slugs: m.shop_by_cat_slugs || '[]',

          trending_active: m.trending_active || 'true',
          trending_title: m.trending_title || 'Trending Items',
          trending_products: m.trending_products || '[]',
        }
        setSettings(newSettings)

        try { setSelectedGoatIds(JSON.parse(newSettings.goat_deal_products)) } catch { setSelectedGoatIds([]) }
        try { setSelectedTopIds(JSON.parse(newSettings.top_deals_products)) } catch { setSelectedTopIds([]) }
        try { setSelectedQualityIds(JSON.parse(newSettings.best_quality_products)) } catch { setSelectedQualityIds([]) }
        try { setSelectedTrendingIds(JSON.parse(newSettings.trending_products)) } catch { setSelectedTrendingIds([]) }
        try { setSelectedCatSlugs(JSON.parse((newSettings as any).shop_by_cat_slugs || '[]')) } catch { setSelectedCatSlugs([]) }
      }
      setLoading(false)
    }
    loadData()
  }, [])

  async function save() {
    setSaving(true)
    const payload = [
      { key: 'goat_deal_active', value: settings.goat_deal_active },
      { key: 'goat_deal_products', value: JSON.stringify(selectedGoatIds) },
      { key: 'goat_deal_more_url', value: settings.goat_deal_more_url },
      { key: 'goat_deal_title', value: settings.goat_deal_title },

      { key: 'top_deals_active', value: settings.top_deals_active },
      { key: 'top_deals_products', value: JSON.stringify(selectedTopIds) },
      { key: 'top_deals_more_url', value: settings.top_deals_more_url },
      { key: 'top_deals_title', value: settings.top_deals_title },

      { key: 'best_quality_active', value: settings.best_quality_active },
      { key: 'best_quality_products', value: JSON.stringify(selectedQualityIds) },
      { key: 'best_quality_more_url', value: settings.best_quality_more_url },
      { key: 'best_quality_title', value: settings.best_quality_title },

      { key: 'shop_by_cat_active', value: settings.shop_by_cat_active },
      { key: 'shop_by_cat_title', value: settings.shop_by_cat_title },
      { key: 'shop_by_cat_slugs', value: JSON.stringify(selectedCatSlugs) },

      { key: 'trending_active', value: settings.trending_active },
      { key: 'trending_title', value: settings.trending_title },
      { key: 'trending_products', value: JSON.stringify(selectedTrendingIds) },
    ]

    await Promise.all(payload.map(e =>
      supabase.from('storefront_settings').upsert(e, { onConflict: 'key' })
    ))

    setSaving(false)
    alert('✅ Campaign deals saved successfully!')
  }

  const addGoatProduct = (id: string) => {
    if (id && !selectedGoatIds.includes(id)) setSelectedGoatIds([...selectedGoatIds, id])
  }
  const removeGoatProduct = (id: string) => {
    setSelectedGoatIds(selectedGoatIds.filter(x => x !== id))
  }

  const addTopProduct = (id: string) => {
    if (id && !selectedTopIds.includes(id)) setSelectedTopIds([...selectedTopIds, id])
  }
  const removeTopProduct = (id: string) => {
    setSelectedTopIds(selectedTopIds.filter(x => x !== id))
  }

  const addQualityProduct = (id: string) => {
    if (id && !selectedQualityIds.includes(id)) setSelectedQualityIds([...selectedQualityIds, id])
  }
  const removeQualityProduct = (id: string) => {
    setSelectedQualityIds(selectedQualityIds.filter(x => x !== id))
  }

  return (
    <div className="p-8 font-light max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-light uppercase tracking-wide" style={{ color: '#1B4332' }}>Deals & Campaigns</h1>
        <p className="text-xs text-gray-500 mt-1">Configure products & promotional targets for dynamic homepage sections</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center text-gray-400 text-xs">Loading campaign settings...</div>
      ) : (
        <div className="space-y-8">
          
          {/* SECTION 1: GOAT DEAL (DEAL OF THE DAY) */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-50">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                  <span>🔥</span> G.O.A.T. Deal (Deal of the Day)
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Appears as a prominent slider showcase on the homepage</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, goat_deal_active: settings.goat_deal_active === 'true' ? 'false' : 'true' })}
                className="px-3.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-semibold transition-all"
                style={{
                  background: settings.goat_deal_active === 'true' ? '#1B4332' : '#f3f4f6',
                  color: settings.goat_deal_active === 'true' ? '#E3BA45' : '#6b7280'
                }}
              >
                {settings.goat_deal_active === 'true' ? '✓ Enabled' : '✗ Disabled'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2 text-gray-500">Deal Section Name / Title</label>
                  <input
                    type="text"
                    value={settings.goat_deal_title}
                    onChange={(e) => setSettings({ ...settings, goat_deal_title: e.target.value })}
                    placeholder="G.O.A.T. Deal"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400"
                  />
                </div>

                <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2 text-gray-500">Select Products to Add</label>
                <select
                  onChange={(e) => { addGoatProduct(e.target.value); e.target.value = '' }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400"
                >
                  <option value="">-- Click to choose a product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.title} (${p.price})</option>
                  ))}
                </select>

                <div className="mt-4">
                  <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2 text-gray-500">Redirect Landing URL ("More Deals")</label>
                  <input
                    type="text"
                    value={settings.goat_deal_more_url}
                    onChange={(e) => setSettings({ ...settings, goat_deal_more_url: e.target.value })}
                    placeholder="/pages/deals or WhatsApp link"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2 text-gray-500">Products in Deal ({selectedGoatIds.length})</label>
                <div className="border border-gray-100 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 bg-gray-50">
                  {selectedGoatIds.map(id => {
                    const p = products.find(x => x.id === id)
                    return (
                      <div key={id} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-gray-100">
                        <span className="text-[11px] text-emerald-950 font-medium truncate pr-4">{p ? p.title : `Product ID: ${id}`}</span>
                        <button onClick={() => removeGoatProduct(id)} className="text-[10px] text-red-500 hover:text-red-700 font-semibold px-2">✕</button>
                      </div>
                    )
                  })}
                  {selectedGoatIds.length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-[11px]">No products added. Fallbacks will apply.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: TOP DEALS */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-50">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                  <span>💎</span> Top Deals Slider
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Appears as a secondary slider showcase on the homepage</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, top_deals_active: settings.top_deals_active === 'true' ? 'false' : 'true' })}
                className="px-3.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-semibold transition-all"
                style={{
                  background: settings.top_deals_active === 'true' ? '#1B4332' : '#f3f4f6',
                  color: settings.top_deals_active === 'true' ? '#E3BA45' : '#6b7280'
                }}
              >
                {settings.top_deals_active === 'true' ? '✓ Enabled' : '✗ Disabled'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2 text-gray-500">Deal Section Name / Title</label>
                  <input
                    type="text"
                    value={settings.top_deals_title}
                    onChange={(e) => setSettings({ ...settings, top_deals_title: e.target.value })}
                    placeholder="Top Deals"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400"
                  />
                </div>

                <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2 text-gray-500">Select Products to Add</label>
                <select
                  onChange={(e) => { addTopProduct(e.target.value); e.target.value = '' }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400"
                >
                  <option value="">-- Click to choose a product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.title} (${p.price})</option>
                  ))}
                </select>

                <div className="mt-4">
                  <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2 text-gray-500">Redirect Landing URL ("More Deals")</label>
                  <input
                    type="text"
                    value={settings.top_deals_more_url}
                    onChange={(e) => setSettings({ ...settings, top_deals_more_url: e.target.value })}
                    placeholder="/pages/deals or WhatsApp link"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2 text-gray-500">Products in Deal ({selectedTopIds.length})</label>
                <div className="border border-gray-100 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 bg-gray-50">
                  {selectedTopIds.map(id => {
                    const p = products.find(x => x.id === id)
                    return (
                      <div key={id} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-gray-100">
                        <span className="text-[11px] text-emerald-950 font-medium truncate pr-4">{p ? p.title : `Product ID: ${id}`}</span>
                        <button onClick={() => removeTopProduct(id)} className="text-[10px] text-red-500 hover:text-red-700 font-semibold px-2">✕</button>
                      </div>
                    )
                  })}
                  {selectedTopIds.length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-[11px]">No products added. Fallbacks will apply.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: BEST QUALITY (2x2 GRID) */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-50">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                  <span>✨</span> Best Quality (2x2 Grid)
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Appears as a 2x2 grid showcase on the homepage</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, best_quality_active: settings.best_quality_active === 'true' ? 'false' : 'true' })}
                className="px-3.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-semibold transition-all"
                style={{
                  background: settings.best_quality_active === 'true' ? '#1B4332' : '#f3f4f6',
                  color: settings.best_quality_active === 'true' ? '#E3BA45' : '#6b7280'
                }}
              >
                {settings.best_quality_active === 'true' ? '✓ Enabled' : '✗ Disabled'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2 text-gray-500">Deal Section Name / Title</label>
                  <input
                    type="text"
                    value={settings.best_quality_title}
                    onChange={(e) => setSettings({ ...settings, best_quality_title: e.target.value })}
                    placeholder="Best Quality"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400"
                  />
                </div>

                <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2 text-gray-500">Select Products to Add</label>
                <select
                  onChange={(e) => { addQualityProduct(e.target.value); e.target.value = '' }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400"
                >
                  <option value="">-- Click to choose a product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.title} (${p.price})</option>
                  ))}
                </select>

                <div className="mt-4">
                  <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2 text-gray-500">Redirect Landing URL ("More Deals")</label>
                  <input
                    type="text"
                    value={settings.best_quality_more_url}
                    onChange={(e) => setSettings({ ...settings, best_quality_more_url: e.target.value })}
                    placeholder="/pages/deals or WhatsApp link"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2 text-gray-500">Products in Deal ({selectedQualityIds.length})</label>
                <div className="border border-gray-100 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 bg-gray-50">
                  {selectedQualityIds.map(id => {
                    const p = products.find(x => x.id === id)
                    return (
                      <div key={id} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-gray-100">
                        <span className="text-[11px] text-emerald-950 font-medium truncate pr-4">{p ? p.title : `Product ID: ${id}`}</span>
                        <button onClick={() => removeQualityProduct(id)} className="text-[10px] text-red-500 hover:text-red-700 font-semibold px-2">✕</button>
                      </div>
                    )
                  })}
                  {selectedQualityIds.length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-[11px]">No products added. Fallbacks will apply.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: TRENDING ITEMS */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-50">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                  <span>🔥</span> Trending Items Section
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Homepage slider showing trending products with Sale badge, star ratings & prices</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, trending_active: settings.trending_active === 'true' ? 'false' : 'true' })}
                className="px-3.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-semibold transition-all"
                style={{ background: settings.trending_active === 'true' ? '#1B4332' : '#f3f4f6', color: settings.trending_active === 'true' ? '#E3BA45' : '#6b7280' }}
              >
                {settings.trending_active === 'true' ? '✓ Enabled' : '✗ Disabled'}
              </button>
            </div>
            <div className="grid gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2 text-gray-500">Section Title</label>
                <input type="text" value={settings.trending_title} onChange={(e) => setSettings({ ...settings, trending_title: e.target.value })} placeholder="Trending Items" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 max-w-xs" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2 text-gray-500">Add Products ({selectedTrendingIds.length})</label>
                <select onChange={(e) => { const v = e.target.value; if (v && !selectedTrendingIds.includes(v)) setSelectedTrendingIds([...selectedTrendingIds, v]); e.target.value = ''; }} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 bg-white">
                  <option value="">+ Select a product to add...</option>
                  {products.filter(p => !selectedTrendingIds.includes(p.id)).map(p => (<option key={p.id} value={p.id}>{p.title} — ${p.price}</option>))}
                </select>
                <div className="border border-gray-100 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 bg-gray-50 mt-2">
                  {selectedTrendingIds.map(id => { const p = products.find(x => x.id === id); return (<div key={id} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-gray-100"><span className="text-[11px] text-emerald-950 font-medium truncate pr-4">{p ? p.title : `ID: ${id}`}</span><button onClick={() => setSelectedTrendingIds(selectedTrendingIds.filter(i => i !== id))} className="text-[10px] text-red-500 font-semibold px-2">✕</button></div>); })}
                  {selectedTrendingIds.length === 0 && <div className="text-center py-6 text-gray-400 text-[11px]">No products added. First 8 products shown as fallback.</div>}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: SHOP BY CATEGORY */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-50">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                  <span>🏷️</span> Shop by Category Section
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Appears as a deals-style slider showing all your categories with click-to-open</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, shop_by_cat_active: settings.shop_by_cat_active === 'true' ? 'false' : 'true' })}
                className="px-3.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-semibold transition-all"
                style={{
                  background: settings.shop_by_cat_active === 'true' ? '#1B4332' : '#f3f4f6',
                  color: settings.shop_by_cat_active === 'true' ? '#E3BA45' : '#6b7280'
                }}
              >
                {settings.shop_by_cat_active === 'true' ? '✓ Enabled' : '✗ Disabled'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2 text-gray-500">Section Title</label>
                <input
                  type="text"
                  value={settings.shop_by_cat_title}
                  onChange={(e) => setSettings({ ...settings, shop_by_cat_title: e.target.value })}
                  placeholder="Shop by Category"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400"
                />

                <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2 text-gray-500 mt-4">Select Categories to Display</label>
                <select
                  onChange={(e) => {
                    const v = e.target.value
                    if (v && !selectedCatSlugs.includes(v)) setSelectedCatSlugs([...selectedCatSlugs, v])
                    e.target.value = ''
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 bg-white"
                >
                  <option value="">+ Select a category to add...</option>
                  {categories.filter(c => !selectedCatSlugs.includes(c.slug)).map(c => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-2">Leave empty to show all categories automatically.</p>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2 text-gray-500">Selected Categories ({selectedCatSlugs.length})</label>
                <div className="border border-gray-100 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 bg-gray-50">
                  {selectedCatSlugs.map(slug => {
                    const cat = categories.find(c => c.slug === slug)
                    return (
                      <div key={slug} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-gray-100">
                        <span className="text-[11px] text-emerald-950 font-medium truncate pr-4">{cat ? cat.name : slug}</span>
                        <button onClick={() => setSelectedCatSlugs(selectedCatSlugs.filter(s => s !== slug))} className="text-[10px] text-red-500 hover:text-red-700 font-semibold px-2">✕</button>
                      </div>
                    )
                  })}
                  {selectedCatSlugs.length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-[11px]">No categories selected — all categories will be shown.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SAVE BUTTON */}
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              onClick={save}
              disabled={saving}
              className="px-6 py-3 rounded-xl text-[10px] uppercase tracking-widest disabled:opacity-60 transition-all flex items-center gap-2"
              style={{ background: '#1B4332', color: '#E3BA45' }}
            >
              {saving ? 'Saving...' : '✓ Save Campaign Settings'}
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
