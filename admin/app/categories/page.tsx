'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useNotification } from '@/components/NotificationProvider'

type Category = { id: string; name: string; slug: string; image_url: string | null; display_order: number; visible: boolean }

const EMPTY_CAT = { name: '', slug: '', image_url: null as string | null, display_order: 0, visible: true }

function formatImageUrl(url: string | null): string {
  if (!url) return ''
  if (url.includes('/dfix/')) {
    const parts = url.split('/dfix/')
    return `/api/image/dfix/${parts[1]}`
  }
  return url
}

export default function CategoriesPage() {
  const { showToast, showConfirm } = useNotification()
  const [categories, setCategories] = useState<Category[]>([])
  
  // Modals state
  const [catModal, setCatModal] = useState<'add' | 'edit' | null>(null)
  const [catForm, setCatForm] = useState<any>(EMPTY_CAT)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    const { data, error } = await supabase.from('categories').select('*').order('display_order')
    if (!error) {
      setCategories(data || [])
    }
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
      display_order: parseInt(catForm.display_order) || 0,
      visible: catForm.visible !== false
    }
    let res;
    if (catModal === 'add') {
      res = await supabase.from('categories').insert([payload])
    } else {
      res = await supabase.from('categories').update(payload).eq('id', catForm.id)
    }
    if (res.error) {
      showToast(`Error saving category: ${res.error.message}\n${res.error.details || ''}`, { type: 'error' });
    } else {
      showToast('Category saved successfully!', { type: 'success' })
      setCatModal(null)
      loadData()
    }
    setSaving(false)
  }

  async function delCat(id: string) {
    const confirmed = await showConfirm('Are you sure you want to delete this category?')
    if (!confirmed) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) {
      showToast(`Error deleting category: ${error.message}`, { type: 'error' })
    } else {
      showToast('Category deleted successfully!', { type: 'success' })
    }
    loadData()
  }

  return (
    <div className="p-8 font-light max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light uppercase tracking-wide" style={{ color: '#1B4332' }}>Collections</h1>
          <p className="text-xs text-gray-500 mt-1">Manage categories shown on your storefront</p>
        </div>
        <div>
          <button onClick={openAddCat} className="px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-normal flex items-center gap-2" style={{ background: '#1B4332', color: '#E3BA45' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
            Add Category
          </button>
        </div>
      </div>

      {/* Categories View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(c => {
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
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <div className="bg-emerald-950/80 backdrop-blur-xs text-white text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-lg">
                    Order: {c.display_order}
                  </div>
                  {!c.visible && (
                    <div className="bg-red-600/90 backdrop-blur-xs text-white text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-lg">
                      Hidden
                    </div>
                  )}
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
                            showToast('Image uploaded successfully!', { type: 'success' })
                          } else {
                            showToast(data.error || 'Upload failed', { type: 'error' })
                            setCatForm({ ...catForm, image_url: originalUrl })
                          }
                        } catch (err) {
                          showToast('Upload error', { type: 'error' })
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
              <div className="flex items-center gap-3">
                <label className="text-[10px] uppercase tracking-wider font-medium text-gray-500">Visible on Storefront</label>
                <button type="button" onClick={() => setCatForm({ ...catForm, visible: catForm.visible !== false ? false : true })} className={`w-10 h-5 rounded-full transition-all relative ${catForm.visible !== false ? 'bg-emerald-600' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${catForm.visible !== false ? 'left-5.5' : 'left-0.5'}`} />
                </button>
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
    </div>
  )
}
