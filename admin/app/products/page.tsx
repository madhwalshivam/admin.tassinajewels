'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useNotification } from '@/components/NotificationProvider'

type Product = {
  id: string; title: string; description: string; price: number; compare_price: number | null;
  image_url: string | null; category: string | null; subcategory_id: string | null;
  sku: string | null; moq: number; tags: string[] | null; available: boolean; featured: boolean;
  stock_quantity: number; stock_status: string; created_at: string;
}
type Category = { id: string; name: string; slug: string }
type FilterGroup = { id: string; name: string; slug: string; is_enabled: boolean }
type FilterValue = { id: string; filter_group_id: string; value: string }
type CategoryFilter = { category_id: string; filter_group_id: string }
type ProductImage = { id?: string; image_url: string; is_primary: boolean; display_order: number; alt_text?: string; _uploading?: boolean }
type Variation = { id?: string; variation_name: string; option_value: string; price: string; sale_price: string; sku: string; stock_quantity: string; stock_status: string; display_order: number }

const EMPTY_VARIATION: Variation = { variation_name: '', option_value: '', price: '', sale_price: '', sku: '', stock_quantity: '0', stock_status: 'in_stock', display_order: 0 }

const EMPTY: Omit<Product, 'id' | 'created_at'> = {
  title: '', description: '', price: 0, compare_price: null, image_url: null,
  category: null, subcategory_id: null, sku: null, moq: 10, tags: null, available: true, featured: false,
  stock_quantity: 0, stock_status: 'in_stock',
}

function formatImageUrl(url: string | null): string {
  if (!url) return ''
  if (url.includes('/dfix/')) {
    const parts = url.split('/dfix/')
    return `/api/image/dfix/${parts[1]}`
  }
  return url
}

export default function ProductsPage() {
  const { showToast, showConfirm } = useNotification()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([])
  const [filterValues, setFilterValues] = useState<FilterValue[]>([])
  const [categoryFilters, setCategoryFilters] = useState<CategoryFilter[]>([])

  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedFilterValues, setSelectedFilterValues] = useState<string[]>([])
  const [productCatMappings, setProductCatMappings] = useState<{ [prodId: string]: string[] }>({})
  const [productImageCounts, setProductImageCounts] = useState<{ [prodId: string]: number }>({})
  const [productVariationCounts, setProductVariationCounts] = useState<{ [prodId: string]: number }>({})

  // Gallery & Variations state
  const [galleryImages, setGalleryImages] = useState<ProductImage[]>([])
  const [variations, setVariations] = useState<Variation[]>([])
  const [activeTab, setActiveTab] = useState<'basic' | 'gallery' | 'variations' | 'filters'>('basic')
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const PER_PAGE = 20

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('products').select('*', { count: 'exact' })
    if (filterCat !== 'all') {
      const { data: pcData } = await supabase.from('product_categories').select('product_id').eq('category_id', filterCat)
      const pids = pcData?.map(pc => pc.product_id) || []
      q = q.in('id', pids.length > 0 ? pids : ['00000000-0000-0000-0000-000000000000'])
    }
    if (search) q = q.ilike('title', `%${search}%`)
    q = q.order('created_at', { ascending: false }).range(page * PER_PAGE, (page + 1) * PER_PAGE - 1)
    const { data, count } = await q
    const loadedProds = data || []
    setProducts(loadedProds)
    setTotal(count || 0)
    const productIds = loadedProds.map(p => p.id)
    if (productIds.length > 0) {
      const [pcRes, imgRes, varRes] = await Promise.all([
        supabase.from('product_categories').select('product_id, category_id').in('product_id', productIds),
        supabase.from('product_images').select('product_id').in('product_id', productIds),
        supabase.from('product_variations').select('product_id').in('product_id', productIds),
      ])
      const catMap: { [key: string]: string[] } = {}
      pcRes.data?.forEach(r => { if (!catMap[r.product_id]) catMap[r.product_id] = []; catMap[r.product_id].push(r.category_id) })
      setProductCatMappings(catMap)
      const imgMap: { [key: string]: number } = {}
      imgRes.data?.forEach(r => { imgMap[r.product_id] = (imgMap[r.product_id] || 0) + 1 })
      setProductImageCounts(imgMap)
      const varMap: { [key: string]: number } = {}
      varRes.data?.forEach(r => { varMap[r.product_id] = (varMap[r.product_id] || 0) + 1 })
      setProductVariationCounts(varMap)
    }
    setLoading(false)
  }, [search, filterCat, page])

  useEffect(() => { load() }, [load])
  
  useEffect(() => {
    // Load metadata once
    supabase.from('categories').select('*').order('display_order').then(({ data }) => setCategories(data || []))
    supabase.from('filter_groups').select('*').order('display_order').then(({ data }) => setFilterGroups(data || []))
    supabase.from('filter_values').select('*').order('created_at').then(({ data }) => setFilterValues(data || []))
    supabase.from('category_filters').select('*').then(({ data }) => setCategoryFilters(data || []))
  }, [])

  function openAdd() {
    setForm(EMPTY)
    setSelectedCategories([])
    setSelectedFilterValues([])
    setGalleryImages([])
    setVariations([])
    setActiveTab('basic')
    setModal('add')
  }

  async function openEdit(p: Product) {
    setForm({ ...p })
    setActiveTab('basic')
    setModal('edit')
    const [catsRes, valsRes, imgRes, varRes] = await Promise.all([
      supabase.from('product_categories').select('category_id').eq('product_id', p.id),
      supabase.from('product_filter_values').select('filter_value_id').eq('product_id', p.id),
      supabase.from('product_images').select('*').eq('product_id', p.id).order('display_order'),
      supabase.from('product_variations').select('*').eq('product_id', p.id).order('display_order'),
    ])
    setSelectedCategories(catsRes.data?.map(c => c.category_id) || [])
    setSelectedFilterValues(valsRes.data?.map(v => v.filter_value_id) || [])
    const imgs: ProductImage[] = imgRes.data?.map(i => ({ id: i.id, image_url: i.image_url, is_primary: i.is_primary, display_order: i.display_order, alt_text: i.alt_text })) || []
    if (imgs.length === 0 && p.image_url) imgs.push({ image_url: p.image_url, is_primary: true, display_order: 0 })
    setGalleryImages(imgs)
    const vars: Variation[] = varRes.data?.map(v => ({ id: v.id, variation_name: v.variation_name, option_value: v.option_value, price: String(v.price || ''), sale_price: String(v.sale_price || ''), sku: v.sku || '', stock_quantity: String(v.stock_quantity || '0'), stock_status: v.stock_status || 'in_stock', display_order: v.display_order })) || []
    setVariations(vars)
  }

  async function save() {
    setSaving(true)
    const firstCatId = selectedCategories[0]
    const primaryCategorySlug = categories.find(c => c.id === firstCatId)?.slug || null
    const primaryImg = galleryImages.find(i => i.is_primary) || galleryImages[0]
    const productPayload = {
      title: form.title, description: form.description,
      price: parseFloat(form.price),
      compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
      image_url: primaryImg?.image_url || form.image_url || null,
      category: primaryCategorySlug, subcategory_id: null,
      sku: form.sku, moq: parseInt(form.moq) || 10, tags: form.tags,
      available: form.available, featured: form.featured,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      stock_status: form.stock_status || 'in_stock',
    }
    let productId = form.id
    let res
    if (modal === 'add') {
      res = await supabase.from('products').insert([productPayload]).select('id').single()
      if (!res.error && res.data) productId = res.data.id
    } else {
      res = await supabase.from('products').update(productPayload).eq('id', form.id)
    }
    if (res.error) { showToast(`Error: ${res.error.message}`, { type: 'error' }); setSaving(false); return }
    if (productId) {
      await supabase.from('product_categories').delete().eq('product_id', productId)
      if (selectedCategories.length > 0) await supabase.from('product_categories').insert(selectedCategories.map(cid => ({ product_id: productId, category_id: cid })))
      await supabase.from('product_filter_values').delete().eq('product_id', productId)
      if (selectedFilterValues.length > 0) await supabase.from('product_filter_values').insert(selectedFilterValues.map(fvid => ({ product_id: productId, filter_value_id: fvid })))
      await supabase.from('product_images').delete().eq('product_id', productId)
      const validImgs = galleryImages.filter(i => i.image_url && !i._uploading)
      if (validImgs.length > 0) await supabase.from('product_images').insert(validImgs.map((img, idx) => ({ product_id: productId, image_url: img.image_url, is_primary: img.is_primary, display_order: idx, alt_text: img.alt_text || '' })))
      await supabase.from('product_variations').delete().eq('product_id', productId)
      if (variations.length > 0) await supabase.from('product_variations').insert(variations.map((v, idx) => ({ product_id: productId, variation_name: v.variation_name, option_value: v.option_value, price: v.price ? parseFloat(v.price) : null, sale_price: v.sale_price ? parseFloat(v.sale_price) : null, sku: v.sku || null, stock_quantity: parseInt(v.stock_quantity) || 0, stock_status: v.stock_status || 'in_stock', display_order: idx })))
    }
    showToast('Product saved!', { type: 'success' }); setModal(null); load(); setSaving(false)
  }

  async function uploadImage(file: File): Promise<string | null> {
    const formData = new FormData(); formData.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      return data.url || null
    } catch { return null }
  }

  async function addGalleryImages(files: FileList) {
    const newImgs: ProductImage[] = Array.from(files).map((_, i) => ({ image_url: '', is_primary: galleryImages.length === 0 && i === 0, display_order: galleryImages.length + i, _uploading: true }))
    setGalleryImages(prev => [...prev, ...newImgs])
    for (let i = 0; i < files.length; i++) {
      const url = await uploadImage(files[i])
      if (url) {
        setGalleryImages(prev => { const updated = [...prev]; const idx = prev.length - files.length + i; if (updated[idx]) { updated[idx] = { ...updated[idx], image_url: url, _uploading: false } } return updated })
      } else {
        showToast('Upload failed for one image', { type: 'error' })
        setGalleryImages(prev => prev.filter((_, idx) => idx !== prev.length - files.length + i))
      }
    }
  }

  function removeGalleryImage(idx: number) {
    setGalleryImages(prev => { const next = prev.filter((_, i) => i !== idx); if (next.length > 0 && !next.some(i => i.is_primary)) next[0].is_primary = true; return next })
  }

  function setPrimaryImage(idx: number) {
    setGalleryImages(prev => prev.map((img, i) => ({ ...img, is_primary: i === idx })))
  }

  function onDragStart(idx: number) { dragItem.current = idx }
  function onDragEnter(idx: number) { dragOverItem.current = idx }
  function onDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null) return
    setGalleryImages(prev => { const next = [...prev]; const [moved] = next.splice(dragItem.current!, 1); next.splice(dragOverItem.current!, 0, moved); return next.map((img, i) => ({ ...img, display_order: i })) })
    dragItem.current = null; dragOverItem.current = null
  }

  function addVariation() { setVariations(prev => [...prev, { ...EMPTY_VARIATION, display_order: prev.length }]) }
  function updateVariation(idx: number, field: keyof Variation, val: string) { setVariations(prev => prev.map((v, i) => i === idx ? { ...v, [field]: val } : v)) }
  function removeVariation(idx: number) { setVariations(prev => prev.filter((_, i) => i !== idx)) }

  async function del(id: string) {
    const confirmed = await showConfirm('Delete this product?')
    if (!confirmed) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) showToast(`Error: ${error.message}`, { type: 'error' })
    else showToast('Deleted!', { type: 'success' })
    load()
  }

  async function toggle(id: string, field: 'available' | 'featured', val: boolean) {
    const { error } = await supabase.from('products').update({ [field]: !val }).eq('id', id)
    if (error) showToast(`Error: ${error.message}`, { type: 'error' })
    else showToast('Updated!', { type: 'success' })
    load()
  }

  const pages = Math.ceil(total / PER_PAGE)

  return (
    <div className="p-8 font-light max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light uppercase tracking-wide" style={{ color: '#1B4332' }}>Products</h1>
          <p className="text-xs text-gray-500 mt-1">{total} products managed</p>
        </div>
        <button onClick={openAdd} className="px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-normal flex items-center gap-2" style={{ background: '#1B4332', color: '#E3BA45' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 items-center">
        <div className="relative flex-1 max-w-xs">
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search catalog..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-light"
          />
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(0) }} className="px-4 py-2 border border-gray-200 rounded-xl text-xs outline-none bg-white font-light text-gray-600">
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 uppercase tracking-wider font-normal text-gray-500">
              {['Image', 'Product Info', 'Collection', 'Price', 'Gallery', 'Variations', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-4 text-left font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Loading catalog data...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No products found in this filter.</td></tr>
            ) : products.map(p => {
              const assignedCatIds = productCatMappings[p.id] || []
              const assignedCatNames = assignedCatIds.map(cid => categories.find(c => c.id === cid)?.name).filter(Boolean)
              
              return (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-all">
                  <td className="px-4 py-4">
                    {p.image_url ? (
                      <img src={formatImageUrl(p.image_url)} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100 text-gray-300">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 max-w-[180px]">
                    <div className="font-normal text-sm truncate" style={{ color: '#1B4332' }}>{p.title}</div>
                    {p.sku ? <div className="text-[10px] text-gray-400 font-mono mt-0.5">SKU: {p.sku}</div> : <div className="text-[10px] text-gray-300 mt-0.5">No SKU</div>}
                  </td>
                  <td className="px-4 py-4 text-gray-500 max-w-[160px]">
                    <div className="font-normal truncate text-xs">{assignedCatNames.join(', ') || 'Unassigned'}</div>
                  </td>
                  <td className="px-4 py-4 font-semibold text-sm" style={{ color: '#1B4332' }}>${p.price?.toFixed(2)}</td>
                  <td className="px-4 py-4">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${(productImageCounts[p.id] || 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                      {productImageCounts[p.id] || 0} imgs
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${(productVariationCounts[p.id] || 0) > 0 ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                      {productVariationCounts[p.id] || 0} vars
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <button onClick={() => toggle(p.id, 'available', p.available)} className={`w-9 h-5 rounded-full transition-all relative ${p.available ? 'bg-emerald-600' : 'bg-gray-200'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${p.available ? 'left-4.5' : 'left-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-normal border transition-all hover:bg-gray-50" style={{ borderColor: '#1B4332', color: '#1B4332' }}>Edit</button>
                      <button onClick={() => del(p.id)} className="px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-normal bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all">Del</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3.5 py-1.5 rounded-xl text-xs border font-normal disabled:opacity-40 hover:bg-gray-50 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-xs text-gray-500 uppercase tracking-wider font-normal">Page {page + 1} of {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page === pages - 1} className="px-3.5 py-1.5 rounded-xl text-xs border font-normal disabled:opacity-40 hover:bg-gray-50 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-xl border border-gray-100 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-normal tracking-wide uppercase" style={{ color: '#1B4332' }}>{modal === 'add' ? 'Add Product' : 'Edit Product'}</h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {/* Tabs */}
            <div className="flex border-b border-gray-100 shrink-0 px-8">
              {(['basic','gallery','variations','filters'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-3 text-[10px] uppercase tracking-wider font-medium border-b-2 transition-all ${activeTab === tab ? 'border-yellow-400 text-emerald-800' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                  {tab === 'basic' ? 'Basic Info' : tab === 'gallery' ? `Gallery (${galleryImages.length})` : tab === 'variations' ? `Variations (${variations.length})` : 'Filters'}
                </button>
              ))}
            </div>

            <div className="p-8 flex-1 overflow-y-auto">
              {/* BASIC INFO TAB */}
              {activeTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Title *</label>
                      <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-light" placeholder="Product title" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Base Price *</label>
                      <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-light" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Compare Price</label>
                      <input type="number" step="0.01" value={form.compare_price || ''} onChange={e => setForm({ ...form, compare_price: e.target.value || null })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-light" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">SKU</label>
                      <input value={form.sku || ''} onChange={e => setForm({ ...form, sku: e.target.value || null })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-mono text-[11px]" placeholder="SKU-001" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">MOQ</label>
                      <input type="number" value={form.moq} onChange={e => setForm({ ...form, moq: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-light" placeholder="10" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Stock Qty</label>
                      <input type="number" value={form.stock_quantity || 0} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-light" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Stock Status</label>
                      <select value={form.stock_status || 'in_stock'} onChange={e => setForm({ ...form, stock_status: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 bg-white font-light">
                        <option value="in_stock">In Stock</option>
                        <option value="out_of_stock">Out of Stock</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Description</label>
                      <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 resize-none font-light" placeholder="Product description..." />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Tags (comma separated)</label>
                      <input value={(form.tags || []).join(', ')} onChange={e => setForm({ ...form, tags: e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean) })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-light" placeholder="gold, bracelet, trending" />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-[10px] uppercase tracking-wider font-medium text-gray-500">Available</label>
                      <button type="button" onClick={() => setForm({ ...form, available: !form.available })} className={`w-10 h-5 rounded-full transition-all relative ${form.available ? 'bg-emerald-600' : 'bg-gray-200'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.available ? 'left-5.5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-[10px] uppercase tracking-wider font-medium text-gray-500">Featured</label>
                      <button type="button" onClick={() => setForm({ ...form, featured: !form.featured })} className={`w-10 h-5 rounded-full transition-all relative ${form.featured ? 'bg-yellow-400' : 'bg-gray-200'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.featured ? 'left-5.5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* GALLERY TAB */}
              {activeTab === 'gallery' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs font-medium text-gray-700">Product Images</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Drag to reorder · Click star to set cover · Upload multiple at once</p>
                    </div>
                    <label className="px-4 py-2 rounded-xl text-[10px] uppercase tracking-wider font-normal border cursor-pointer transition-all hover:bg-gray-50 flex items-center gap-2" style={{ borderColor: '#1B4332', color: '#1B4332' }}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Upload Images
                      <input type="file" accept="image/*" multiple className="hidden" onChange={e => { if (e.target.files && e.target.files.length > 0) addGalleryImages(e.target.files) }} />
                    </label>
                  </div>
                  {galleryImages.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
                      <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <p className="text-xs text-gray-400">No images yet. Upload product photos above.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {galleryImages.map((img, idx) => (
                        <div key={idx} draggable onDragStart={() => onDragStart(idx)} onDragEnter={() => onDragEnter(idx)} onDragEnd={onDragEnd} className="relative group rounded-xl overflow-hidden border border-gray-200 aspect-square bg-gray-50 cursor-grab active:cursor-grabbing">
                          {img._uploading ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                            </div>
                          ) : (
                            <img src={formatImageUrl(img.image_url)} alt="" className="w-full h-full object-cover" />
                          )}
                          {img.is_primary && <div className="absolute top-1.5 left-1.5 bg-yellow-400 text-yellow-900 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide">Cover</div>}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                            {!img.is_primary && !img._uploading && (
                              <button onClick={() => setPrimaryImage(idx)} className="w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-900 text-xs font-bold" title="Set as cover">★</button>
                            )}
                            <button onClick={() => removeGalleryImage(idx)} className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white text-xs" title="Remove">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* VARIATIONS TAB */}
              {activeTab === 'variations' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs font-medium text-gray-700">Product Variations</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Each variation can have its own price, SKU, and stock</p>
                    </div>
                    <button onClick={addVariation} className="px-4 py-2 rounded-xl text-[10px] uppercase tracking-wider font-normal border flex items-center gap-2" style={{ borderColor: '#1B4332', color: '#1B4332' }}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Add Variation
                    </button>
                  </div>
                  {variations.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
                      <p className="text-xs text-gray-400">No variations yet. Add size, color, material options above.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {variations.map((v, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Variation #{idx + 1}</span>
                            <button onClick={() => removeVariation(idx)} className="text-red-400 hover:text-red-600 text-xs font-medium">Remove</button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">Variation Name *</label>
                              <input value={v.variation_name} onChange={e => updateVariation(idx, 'variation_name', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-yellow-400 bg-white" placeholder="e.g. Size, Color" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">Option Value *</label>
                              <input value={v.option_value} onChange={e => updateVariation(idx, 'option_value', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-yellow-400 bg-white" placeholder="e.g. Small, Red, 18K" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">Price</label>
                              <input type="number" step="0.01" value={v.price} onChange={e => updateVariation(idx, 'price', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-yellow-400 bg-white" placeholder="Override price" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">Sale Price</label>
                              <input type="number" step="0.01" value={v.sale_price} onChange={e => updateVariation(idx, 'sale_price', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-yellow-400 bg-white" placeholder="Optional sale price" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">SKU</label>
                              <input value={v.sku} onChange={e => updateVariation(idx, 'sku', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-yellow-400 bg-white font-mono" placeholder="SKU-S-RED" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">Stock Qty</label>
                              <input type="number" value={v.stock_quantity} onChange={e => updateVariation(idx, 'stock_quantity', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-yellow-400 bg-white" />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[10px] text-gray-400 mb-1">Stock Status</label>
                              <select value={v.stock_status} onChange={e => updateVariation(idx, 'stock_status', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-yellow-400 bg-white">
                                <option value="in_stock">In Stock</option>
                                <option value="out_of_stock">Out of Stock</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* FILTERS TAB */}
              {activeTab === 'filters' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Categories / Collections</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {categories.map(c => (
                        <label key={c.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-all ${selectedCategories.includes(c.id) ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 font-normal' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                          <input type="checkbox" checked={selectedCategories.includes(c.id)} onChange={e => { if (e.target.checked) setSelectedCategories([...selectedCategories, c.id]); else setSelectedCategories(selectedCategories.filter(id => id !== c.id)) }} className="w-3.5 h-3.5 accent-emerald-800" />
                          <span>{c.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-4">
                    <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2.5 text-emerald-950">Dynamic Filter Values</label>
                    {selectedCategories.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Select categories first to see filters.</p>
                    ) : (
                      <div className="space-y-4">
                        {filterGroups.filter(g => g.is_enabled && categoryFilters.some(cf => selectedCategories.includes(cf.category_id) && cf.filter_group_id === g.id)).map(g => {
                          const groupVals = filterValues.filter(fv => fv.filter_group_id === g.id)
                          return (
                            <div key={g.id} className="space-y-1.5">
                              <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-400">{g.name}</span>
                              <div className="flex flex-wrap gap-2">
                                {groupVals.map(fv => (
                                  <label key={fv.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs cursor-pointer select-none transition-all ${selectedFilterValues.includes(fv.id) ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                                    <input type="checkbox" checked={selectedFilterValues.includes(fv.id)} onChange={e => { if (e.target.checked) setSelectedFilterValues([...selectedFilterValues, fv.id]); else setSelectedFilterValues(selectedFilterValues.filter(id => id !== fv.id)) }} className="w-3 h-3 accent-emerald-800" />
                                    <span>{fv.value}</span>
                                  </label>
                              ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-8 py-5 border-t border-gray-100 shrink-0">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-normal border text-gray-500 hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving || !form.title || !form.price} className="flex-1 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-normal disabled:opacity-60 transition-all" style={{ background: '#1B4332', color: '#E3BA45' }}>
                {saving ? 'Saving...' : modal === 'add' ? 'Create Product' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}