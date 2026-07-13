'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useNotification } from '@/components/NotificationProvider'

type Product = {
  id: string; title: string; description: string; price: number; compare_price: number | null;
  image_url: string | null; category: string | null; subcategory_id: string | null;
  sku: string | null; moq: number; tags: string[] | null; available: boolean; featured: boolean; created_at: string;
}
type Category = { id: string; name: string; slug: string }
type Subcategory = { id: string; category_id: string; name: string; slug: string }
type FilterGroup = { id: string; name: string; slug: string; is_enabled: boolean }
type FilterValue = { id: string; filter_group_id: string; value: string }
type CategoryFilter = { category_id: string; filter_group_id: string }

const EMPTY: Omit<Product, 'id' | 'created_at'> = {
  title: '', description: '', price: 0, compare_price: null, image_url: null,
  category: null, subcategory_id: null, sku: null, moq: 10, tags: null, available: true, featured: false,
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
      // Find product IDs assigned to this category from product_categories table
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
      const [pcRes] = await Promise.all([
        supabase.from('product_categories').select('product_id, category_id').in('product_id', productIds)
      ])
      
      const catMap: { [key: string]: string[] } = {}
      pcRes.data?.forEach(r => {
        if (!catMap[r.product_id]) catMap[r.product_id] = []
        catMap[r.product_id].push(r.category_id)
      })
      setProductCatMappings(catMap)
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
    setModal('add')
  }

  async function openEdit(p: Product) {
    setForm({ ...p })
    setModal('edit')
    
    // Fetch current assignments
    const [catsRes, valsRes] = await Promise.all([
      supabase.from('product_categories').select('category_id').eq('product_id', p.id),
      supabase.from('product_filter_values').select('filter_value_id').eq('product_id', p.id)
    ])
    
    setSelectedCategories(catsRes.data?.map(c => c.category_id) || [])
    setSelectedFilterValues(valsRes.data?.map(v => v.filter_value_id) || [])
  }

  async function save() {
    setSaving(true)
    
    // Determine primary category slug for backward compatibility
    const firstCatId = selectedCategories[0]
    const primaryCategorySlug = categories.find(c => c.id === firstCatId)?.slug || null

    const productPayload = {
      title: form.title,
      description: form.description,
      price: parseFloat(form.price),
      compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
      image_url: form.image_url,
      category: primaryCategorySlug,
      subcategory_id: null,
      sku: form.sku,
      moq: parseInt(form.moq) || 10,
      tags: form.tags,
      available: form.available,
      featured: form.featured,
    }

    let productId = form.id
    let res
    if (modal === 'add') {
      res = await supabase.from('products').insert([productPayload]).select('id').single()
      if (!res.error && res.data) {
        productId = res.data.id
      }
    } else {
      res = await supabase.from('products').update(productPayload).eq('id', form.id)
    }

    if (res.error) {
      showToast(`Error saving product: ${res.error.message}\n${res.error.details || ''}`, { type: 'error' })
      setSaving(false)
      return
    }

    // Save Many-to-Many Relationships
    if (productId) {
      // 1. Update Product Categories
      await supabase.from('product_categories').delete().eq('product_id', productId)
      if (selectedCategories.length > 0) {
        await supabase.from('product_categories').insert(
          selectedCategories.map(cid => ({ product_id: productId, category_id: cid }))
        )
      }

      // 2. Update Product Subcategories (Removed)

      // 3. Update Product Filter Values
      await supabase.from('product_filter_values').delete().eq('product_id', productId)
      if (selectedFilterValues.length > 0) {
        await supabase.from('product_filter_values').insert(
          selectedFilterValues.map(fvid => ({ product_id: productId, filter_value_id: fvid }))
        )
      }
    }

    showToast('Product saved successfully!', { type: 'success' })
    setModal(null)
    load()
    setSaving(false)
  }

  async function del(id: string) {
    const confirmed = await showConfirm('Are you sure you want to delete this product?')
    if (!confirmed) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      showToast(`Error deleting product: ${error.message}`, { type: 'error' })
    } else {
      showToast('Product deleted successfully!', { type: 'success' })
    }
    load()
  }

  async function toggle(id: string, field: 'available' | 'featured', val: boolean) {
    const { error } = await supabase.from('products').update({ [field]: !val }).eq('id', id)
    if (error) {
      showToast(`Error updating product status: ${error.message}`, { type: 'error' })
    } else {
      showToast(`Product ${field} status updated!`, { type: 'success' })
    }
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
              {['Image', 'Product Info', 'Collection Info', 'Price', 'MOQ', 'Status', 'Featured', 'Actions'].map(h => (
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
                  <td className="px-4 py-4 max-w-[200px]">
                    <div className="font-normal text-sm truncate" style={{ color: '#1B4332' }}>{p.title}</div>
                    {p.sku ? <div className="text-[10px] text-gray-400 font-mono mt-0.5">SKU: {p.sku}</div> : <div className="text-[10px] text-gray-300 font-light mt-0.5">No SKU</div>}
                  </td>
                  <td className="px-4 py-4 text-gray-500 max-w-[250px]">
                    <div className="font-normal truncate">{assignedCatNames.join(', ') || 'Unassigned'}</div>
                  </td>
                  <td className="px-4 py-4 font-semibold text-sm" style={{ color: '#1B4332' }}>${p.price?.toFixed(2)}</td>
                  <td className="px-4 py-4 text-gray-500">{p.moq} pcs</td>
                  <td className="px-4 py-4">
                    <button onClick={() => toggle(p.id, 'available', p.available)} className={`w-9 h-5 rounded-full transition-all relative ${p.available ? 'bg-emerald-600' : 'bg-gray-200'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${p.available ? 'left-4.5' : 'left-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <button onClick={() => toggle(p.id, 'featured', p.featured)} className={`w-9 h-5 rounded-full transition-all relative ${p.featured ? 'bg-yellow-400' : 'bg-gray-200'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${p.featured ? 'left-4.5' : 'left-0.5'}`} />
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
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <h2 className="text-base font-normal tracking-wide uppercase" style={{ color: '#1B4332' }}>{modal === 'add' ? 'Add Product' : 'Edit Product'}</h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Title *</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-light" placeholder="Product title" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Price *</label>
                  <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-light" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Compare Price</label>
                  <input type="number" step="0.01" value={form.compare_price || ''} onChange={e => setForm({ ...form, compare_price: e.target.value || null })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-light" placeholder="0.00" />
                </div>

                {/* Categories Assignment */}
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Categories / Collections (Select Multiple)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categories.map(c => (
                      <label key={c.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-all ${selectedCategories.includes(c.id) ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 font-normal' : 'border-gray-150 hover:bg-gray-50 text-gray-600'}`}>
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(c.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedCategories([...selectedCategories, c.id])
                            } else {
                              setSelectedCategories(selectedCategories.filter(id => id !== c.id))
                            }
                          }}
                          className="w-3.5 h-3.5 accent-emerald-800"
                        />
                        <span>{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Subcategories Assignment Removed */}

                {/* Dynamic Filters Values Assignment */}
                <div className="col-span-2 border-t border-gray-100 pt-4">
                  <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2.5 text-emerald-950">Dynamic Product Filter Values (Select Multiple)</label>
                  {selectedCategories.length === 0 ? (
                    <div className="text-xs text-gray-400 italic">Select one or more categories first to see available filters.</div>
                  ) : (
                    <div className="space-y-4">
                      {filterGroups
                        .filter(g => g.is_enabled && categoryFilters.some(cf => selectedCategories.includes(cf.category_id) && cf.filter_group_id === g.id))
                        .map(g => {
                          const groupVals = filterValues.filter(fv => fv.filter_group_id === g.id)
                          return (
                            <div key={g.id} className="space-y-1.5">
                              <span className="block text-[10px] uppercase tracking-wider font-bold text-gray-400">{g.name}</span>
                              <div className="flex flex-wrap gap-2">
                                {groupVals.map(fv => (
                                  <label key={fv.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs cursor-pointer select-none transition-all ${selectedFilterValues.includes(fv.id) ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 font-normal' : 'border-gray-150 hover:bg-gray-50 text-gray-600'}`}>
                                    <input
                                      type="checkbox"
                                      checked={selectedFilterValues.includes(fv.id)}
                                      onChange={e => {
                                        if (e.target.checked) {
                                          setSelectedFilterValues([...selectedFilterValues, fv.id])
                                        } else {
                                          setSelectedFilterValues(selectedFilterValues.filter(id => id !== fv.id))
                                        }
                                      }}
                                      className="w-3 h-3 accent-emerald-800"
                                    />
                                    <span>{fv.value}</span>
                                  </label>
                                ))}
                                {groupVals.length === 0 && (
                                  <span className="text-xs text-gray-400 italic">No values defined for this filter group.</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      {filterGroups.filter(g => g.is_enabled && categoryFilters.some(cf => selectedCategories.includes(cf.category_id) && cf.filter_group_id === g.id)).length === 0 && (
                        <div className="text-xs text-gray-400 italic">No dynamic filters assigned to the selected categories.</div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">SKU</label>
                  <input value={form.sku || ''} onChange={e => setForm({ ...form, sku: e.target.value || null })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-mono text-[11px]" placeholder="SKU-001" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">MOQ</label>
                  <input type="number" value={form.moq} onChange={e => setForm({ ...form, moq: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-light" placeholder="10" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Image</label>
                  <div className="flex gap-3 items-center">
                    <input
                      value={form.image_url || ''}
                      onChange={e => setForm({ ...form, image_url: e.target.value || null })}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-[10px] font-mono outline-none focus:border-yellow-400"
                      placeholder="Paste Image URL or upload file →"
                    />
                    <label className="px-4 py-2.5 rounded-xl text-[10px] uppercase tracking-wider font-normal border cursor-pointer transition-all hover:bg-gray-50 shrink-0 text-center" style={{ borderColor: '#1B4332', color: '#1B4332' }}>
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const formData = new FormData()
                          formData.append('file', file)
                          
                          const originalUrl = form.image_url
                          setForm({ ...form, image_url: 'Uploading...' })
                          
                          try {
                            const res = await fetch('/api/upload', {
                              method: 'POST',
                              body: formData,
                            })
                            const data = await res.json()
                            if (data.url) {
                              setForm({ ...form, image_url: data.url })
                              showToast('Image uploaded successfully!', { type: 'success' })
                            } else {
                              showToast(data.error || 'Upload failed', { type: 'error' })
                              setForm({ ...form, image_url: originalUrl })
                            }
                          } catch (err) {
                            showToast('Upload error', { type: 'error' })
                            setForm({ ...form, image_url: originalUrl })
                          }
                        }}
                      />
                    </label>
                  </div>
                  {form.image_url && form.image_url !== 'Uploading...' && (
                    <img src={formatImageUrl(form.image_url)} alt="preview" className="mt-2 h-24 rounded-lg object-cover border border-gray-100" />
                  )}
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

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-normal border text-gray-500 hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving || !form.title || !form.price || selectedCategories.length === 0} className="flex-1 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-normal disabled:opacity-60 transition-all" style={{ background: '#1B4332', color: '#E3BA45' }}>
                {saving ? 'Saving...' : modal === 'add' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
