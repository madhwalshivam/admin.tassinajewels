'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

type Category = { id: string; name: string; slug: string; image_url: string | null; display_order: number }
type Subcategory = { id: string; category_id: string; name: string; slug: string; display_order: number }

const EMPTY_CAT = { name: '', slug: '', image_url: null as string | null, display_order: 0 }
const EMPTY_SUBCAT = { category_id: '', name: '', slug: '', display_order: 0 }

function formatImageUrl(url: string | null): string {
  if (!url) return ''
  if (url.includes('/dfix/')) {
    const parts = url.split('/dfix/')
    return `/api/image/dfix/${parts[1]}`
  }
  return url
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [activeTab, setActiveTab] = useState<'categories' | 'subcategories'>('categories')
  
  // Modals state
  const [catModal, setCatModal] = useState<'add' | 'edit' | null>(null)
  const [catForm, setCatForm] = useState<any>(EMPTY_CAT)
  const [subcatModal, setSubcatModal] = useState<'add' | 'edit' | null>(null)
  const [subcatForm, setSubcatForm] = useState<any>(EMPTY_SUBCAT)
  
  const [saving, setSaving] = useState(false)
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all')

  const loadData = useCallback(async () => {
    const [catRes, subcatRes] = await Promise.all([
      supabase.from('categories').select('*').order('display_order'),
      supabase.from('subcategories').select('*').order('display_order')
    ])
    setCategories(catRes.data || [])
    setSubcategories(subcatRes.data || [])
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // --- CATEGORIES CRUD ---
  function openAddCat() { setCatForm(EMPTY_CAT); setCatModal('add') }
  function openEditCat(c: Category) { setCatForm({ ...c }); setCatModal('edit') }

  async function saveCat() {
    setSaving(true)
    const payload = {
      name: catForm.name,
      slug: catForm.slug.toLowerCase().replace(/\s+/g, '-'),
      image_url: catForm.image_url,
      display_order: parseInt(catForm.display_order) || 0
    }
    let res;
    if (catModal === 'add') {
      res = await supabase.from('categories').insert([payload])
    } else {
      res = await supabase.from('categories').update(payload).eq('id', catForm.id)
    }
    if (res.error) {
      alert(`Error saving category: ${res.error.message}\n${res.error.details || ''}`);
    } else {
      setCatModal(null)
      loadData()
    }
    setSaving(false)
  }

  async function delCat(id: string) {
    if (!confirm('Are you sure you want to delete this category? All its subcategories will be permanently deleted.')) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) alert(`Error deleting category: ${error.message}`);
    loadData()
  }

  // --- SUBCATEGORIES CRUD ---
  function openAddSubcat() {
    // Set default category to the current filter or the first available category
    const defaultCatId = selectedCatFilter !== 'all' ? selectedCatFilter : (categories[0]?.id || '')
    setSubcatForm({ ...EMPTY_SUBCAT, category_id: defaultCatId })
    setSubcatModal('add')
  }
  function openEditSubcat(s: Subcategory) { setSubcatForm({ ...s }); setSubcatModal('edit') }

  async function saveSubcat() {
    setSaving(true)
    const payload = {
      category_id: subcatForm.category_id,
      name: subcatForm.name,
      slug: subcatForm.slug.toLowerCase().replace(/\s+/g, '-'),
      display_order: parseInt(subcatForm.display_order) || 0
    }
    let res;
    if (subcatModal === 'add') {
      res = await supabase.from('subcategories').insert([payload])
    } else {
      res = await supabase.from('subcategories').update(payload).eq('id', subcatForm.id)
    }
    if (res.error) {
      alert(`Error saving subcategory: ${res.error.message}\n${res.error.details || ''}`);
    } else {
      setSubcatModal(null)
      loadData()
    }
    setSaving(false)
  }

  async function delSubcat(id: string) {
    if (!confirm('Are you sure you want to delete this subcategory?')) return
    const { error } = await supabase.from('subcategories').delete().eq('id', id)
    if (error) alert(`Error deleting subcategory: ${error.message}`)
    loadData()
  }

  const filteredSubcategories = selectedCatFilter === 'all'
    ? subcategories
    : subcategories.filter(s => s.category_id === selectedCatFilter)

  return (
    <div className="p-8 font-light max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light uppercase tracking-wide" style={{ color: '#1B4332' }}>Collections</h1>
          <p className="text-xs text-gray-500 mt-1">Manage categories and their individual subcategory points</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'categories' ? (
            <button onClick={openAddCat} className="px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-normal flex items-center gap-2" style={{ background: '#1B4332', color: '#E3BA45' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
              Add Category
            </button>
          ) : (
            <button onClick={openAddSubcat} className="px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-normal flex items-center gap-2" style={{ background: '#1B4332', color: '#E3BA45' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
              Add Subcategory
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('categories')}
          className="px-6 py-3 text-xs uppercase tracking-widest font-normal border-b-2 transition-all"
          style={{
            borderColor: activeTab === 'categories' ? '#1B4332' : 'transparent',
            color: activeTab === 'categories' ? '#1B4332' : '#9ca3af'
          }}
        >
          Categories ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab('subcategories')}
          className="px-6 py-3 text-xs uppercase tracking-widest font-normal border-b-2 transition-all"
          style={{
            borderColor: activeTab === 'subcategories' ? '#1B4332' : 'transparent',
            color: activeTab === 'subcategories' ? '#1B4332' : '#9ca3af'
          }}
        >
          Subcategories ({subcategories.length})
        </button>
      </div>

      {/* Categories View */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map(c => {
            const subCount = subcategories.filter(s => s.category_id === c.id).length
            const imgUrl = c.image_url ? formatImageUrl(c.image_url) : null
            
            return (
              <div key={c.id} className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col">
                {/* Visual Header */}
                <div className="h-44 relative bg-gray-50 flex-shrink-0">
                  {imgUrl ? (
                    <img src={imgUrl} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                      <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <span className="text-[10px] uppercase tracking-wider">No Thumbnail</span>
                    </div>
                  )}
                  {/* Badge & Order */}
                  <div className="absolute top-3 left-3 bg-emerald-950/80 backdrop-blur-xs text-white text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-lg">
                    Order: {c.display_order}
                  </div>
                  <div className="absolute top-3 right-3 bg-amber-400 text-emerald-950 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-sm">
                    {subCount} Subcategories
                  </div>
                  {/* Gradient shade */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 text-white font-medium text-base tracking-wide capitalize font-serif drop-shadow-sm">
                    {c.name}
                  </div>
                </div>

                {/* Details Footer */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-semibold">Storefront Slug</span>
                    <code className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md mt-1 inline-block">{c.slug}</code>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-50 justify-end">
                    <button
                      onClick={() => openEditCat(c)}
                      className="px-3.5 py-2 rounded-xl border text-[10px] uppercase tracking-wider font-semibold transition-all hover:bg-emerald-50 flex items-center gap-1.5"
                      style={{ borderColor: '#1B4332', color: '#1B4332' }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Edit
                    </button>
                    <button
                      onClick={() => delCat(c.id)}
                      className="px-3.5 py-2 rounded-xl text-[10px] uppercase tracking-wider font-semibold bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {categories.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white border border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs">
              No categories found. Click Add Category to get started.
            </div>
          )}
        </div>
      )}

      {/* Subcategories View */}
      {activeTab === 'subcategories' && (
        <div className="space-y-6">
          {/* Category Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 shadow-xs border border-gray-100">
            <div>
              <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Filter by Parent Category</span>
              <p className="text-[10px] text-gray-400 mt-0.5">Narrow down subcategories display</p>
            </div>
            <select
              value={selectedCatFilter}
              onChange={e => setSelectedCatFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 bg-white min-w-[200px]"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSubcategories.map(s => {
              const parent = categories.find(c => c.id === s.category_id)
              return (
                <div key={s.id} className="bg-white rounded-xl p-4 border border-gray-100 hover:border-emerald-100 shadow-xs flex justify-between items-center transition-all">
                  <div className="space-y-1.5 min-w-0 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                        {parent?.name || 'Unassigned'}
                      </span>
                      <span className="text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800">
                        Order {s.display_order}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-emerald-950 truncate">{s.name}</h4>
                    <div className="text-[10px] text-gray-400 font-mono">slug: {s.slug}</div>
                  </div>

                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => openEditSubcat(s)}
                      className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:border-emerald-600 hover:text-emerald-700 transition-all"
                      title="Edit Subcategory"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button
                      onClick={() => delSubcat(s.id)}
                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                      title="Delete Subcategory"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              )
            })}
            {filteredSubcategories.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white border border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs">
                No subcategories found. Click Add Subcategory to add individual subcategories.
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- CATEGORY MODAL --- */}
      {catModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <h2 className="text-base font-normal tracking-wide uppercase" style={{ color: '#1B4332' }}>
                {catModal === 'add' ? 'Add Category' : 'Edit Category'}
              </h2>
              <button onClick={() => setCatModal(null)} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Name *</label>
                <input
                  value={catForm.name}
                  onChange={e => setCatForm({ ...catForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-light"
                  placeholder="e.g. Rings"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Slug *</label>
                <input
                  value={catForm.slug}
                  onChange={e => setCatForm({ ...catForm, slug: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-mono text-[11px]"
                  placeholder="e.g. rings"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Image</label>
                <div className="flex gap-2 items-center">
                  <input
                    value={catForm.image_url || ''}
                    onChange={e => setCatForm({ ...catForm, image_url: e.target.value || null })}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-[10px] font-mono outline-none focus:border-yellow-400"
                    placeholder="Paste URL or upload image →"
                  />
                  <label className="px-3.5 py-2.5 rounded-xl text-[10px] uppercase tracking-wider font-normal border cursor-pointer transition-all hover:bg-gray-50 shrink-0 text-center" style={{ borderColor: '#1B4332', color: '#1B4332' }}>
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
                        
                        const originalUrl = catForm.image_url
                        setCatForm({ ...catForm, image_url: 'Uploading...' })
                        
                        try {
                          const res = await fetch('/api/upload', { method: 'POST', body: formData })
                          const data = await res.json()
                          if (data.url) {
                            setCatForm({ ...catForm, image_url: data.url })
                          } else {
                            alert(data.error || 'Upload failed')
                            setCatForm({ ...catForm, image_url: originalUrl })
                          }
                        } catch (err) {
                          alert('Upload error')
                          setCatForm({ ...catForm, image_url: originalUrl })
                        }
                      }}
                    />
                  </label>
                </div>
                {catForm.image_url && catForm.image_url !== 'Uploading...' && (
                  <img src={formatImageUrl(catForm.image_url)} alt="preview" className="mt-2 h-16 rounded-lg object-cover border border-gray-100" />
                )}
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Display Order</label>
                <input
                  type="number"
                  value={catForm.display_order}
                  onChange={e => setCatForm({ ...catForm, display_order: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-light"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setCatModal(null)} className="flex-1 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-normal border text-gray-500 hover:bg-gray-50">Cancel</button>
              <button onClick={saveCat} disabled={saving || !catForm.name} className="flex-1 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-normal disabled:opacity-60 transition-all" style={{ background: '#1B4332', color: '#E3BA45' }}>
                {saving ? 'Saving...' : catModal === 'add' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SUBCATEGORY MODAL --- */}
      {subcatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <h2 className="text-base font-normal tracking-wide uppercase" style={{ color: '#1B4332' }}>
                {subcatModal === 'add' ? 'Add Subcategory' : 'Edit Subcategory'}
              </h2>
              <button onClick={() => setSubcatModal(null)} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Parent Category *</label>
                <select
                  value={subcatForm.category_id}
                  onChange={e => setSubcatForm({ ...subcatForm, category_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 bg-white"
                  required
                >
                  <option value="" disabled>Select parent category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Subcategory Name *</label>
                <input
                  value={subcatForm.name}
                  onChange={e => setSubcatForm({ ...subcatForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-light"
                  placeholder="e.g. Engagement Rings"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Slug *</label>
                <input
                  value={subcatForm.slug}
                  onChange={e => setSubcatForm({ ...subcatForm, slug: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-mono text-[11px]"
                  placeholder="e.g. engagement-rings"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Display Order</label>
                <input
                  type="number"
                  value={subcatForm.display_order}
                  onChange={e => setSubcatForm({ ...subcatForm, display_order: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-light"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setSubcatModal(null)} className="flex-1 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-normal border text-gray-500 hover:bg-gray-50">Cancel</button>
              <button onClick={saveSubcat} disabled={saving || !subcatForm.name || !subcatForm.category_id} className="flex-1 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-normal disabled:opacity-60 transition-all" style={{ background: '#1B4332', color: '#E3BA45' }}>
                {saving ? 'Saving...' : subcatModal === 'add' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
