'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

type Category = { id: string; name: string; slug: string }
type Product = { id: string; title: string }
type MenuItem = {
  id: string
  name: string
  slug: string
  visible: boolean
  subcategories: Array<{
    id: string
    name: string
    slug: string
    visible: boolean
  }>
}

export default function NavigationPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Edit states
  const [activeParentEdit, setActiveParentEdit] = useState<string | null>(null)
  const [activeChildEdit, setActiveChildEdit] = useState<{ parentId: string; childId: string } | null>(null)
  const [editForm, setEditForm] = useState({ name: '', slug: '', linkType: 'custom' })

  const loadData = useCallback(async () => {
    setLoading(true)
    
    // 1. Fetch categories
    const { data: catsData } = await supabase.from('categories').select('id, name, slug').order('display_order')
    const loadedCats = catsData || []
    setCategories(loadedCats)

    // 2. Fetch products (removed slug since it does not exist in schema)
    const { data: prodsData, error: prodsError } = await supabase.from('products').select('id, title').order('title')
    if (prodsError) console.error("Error fetching products:", prodsError)
    setProducts(prodsData || [])

    // 2. Fetch storefront settings
    const { data: settingsData } = await supabase.from('storefront_settings').select('*')
    const settingsMap: { [key: string]: string } = {}
    settingsData?.forEach(item => {
      settingsMap[item.key] = item.value
    })

    if (settingsMap.navbar_menu) {
      try {
        const parsed = JSON.parse(settingsMap.navbar_menu)
        if (Array.isArray(parsed)) {
          setMenuItems(parsed)
        } else {
          setMenuItems([])
        }
      } catch (e) {
        console.error('Failed to parse navbar_menu setting:', e)
        setMenuItems([])
      }
    } else {
      // Seed default menu tree based on loaded categories
      const defaults = loadedCats.map(cat => ({
        id: cat.id || cat.slug,
        name: cat.name,
        slug: cat.slug,
        visible: true,
        subcategories: []
      }))
      setMenuItems(defaults)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function saveMenu() {
    setSaving(true)
    const payload = {
      key: 'navbar_menu',
      value: JSON.stringify(menuItems)
    }
    const { error } = await supabase.from('storefront_settings').upsert(payload, { onConflict: 'key' })
    if (error) {
      alert(`Error saving menu: ${error.message}`)
    } else {
      alert('Navigation menu saved successfully! Re-publishing to storefront.')
    }
    setSaving(false)
  }

  // --- Actions ---
  function addParentItem() {
    const newItem: MenuItem = {
      id: 'parent_' + Math.random().toString(36).substr(2, 9),
      name: 'New Menu Item',
      slug: '',
      visible: true,
      subcategories: []
    }
    setMenuItems([...menuItems, newItem])
  }

  function deleteParentItem(parentId: string) {
    if (!confirm('Are you sure you want to delete this menu item and all its dropdown items?')) return
    setMenuItems(menuItems.filter(item => item.id !== parentId))
    if (activeParentEdit === parentId) setActiveParentEdit(null)
  }

  function toggleParentVisible(parentId: string) {
    setMenuItems(
      menuItems.map(item => (item.id === parentId ? { ...item, visible: !item.visible } : item))
    )
  }

  function moveParent(index: number, direction: 'up' | 'down') {
    const nextIndex = direction === 'up' ? index - 1 : index + 1
    if (nextIndex < 0 || nextIndex >= menuItems.length) return
    const updated = [...menuItems]
    const temp = updated[index]
    updated[index] = updated[nextIndex]
    updated[nextIndex] = temp
    setMenuItems(updated)
  }

  // --- Sub-items actions ---
  function addChildItem(parentId: string) {
    const newChild = {
      id: 'child_' + Math.random().toString(36).substr(2, 9),
      name: 'New Dropdown Link',
      slug: '',
      visible: true
    }
    setMenuItems(
      menuItems.map(item => {
        if (item.id === parentId) {
          return { ...item, subcategories: [...item.subcategories, newChild] }
        }
        return item
      })
    )
  }

  function deleteChildItem(parentId: string, childId: string) {
    if (!confirm('Are you sure you want to delete this dropdown item?')) return
    setMenuItems(
      menuItems.map(item => {
        if (item.id === parentId) {
          return { ...item, subcategories: item.subcategories.filter(sub => sub.id !== childId) }
        }
        return item
      })
    )
    if (activeChildEdit?.childId === childId) setActiveChildEdit(null)
  }

  function toggleChildVisible(parentId: string, childId: string) {
    setMenuItems(
      menuItems.map(item => {
        if (item.id === parentId) {
          return {
            ...item,
            subcategories: item.subcategories.map(sub =>
              sub.id === childId ? { ...sub, visible: !sub.visible } : sub
            )
          }
        }
        return item
      })
    )
  }

  function moveChild(parentId: string, index: number, direction: 'up' | 'down') {
    const nextIndex = direction === 'up' ? index - 1 : index + 1
    setMenuItems(
      menuItems.map(item => {
        if (item.id === parentId) {
          const subs = [...item.subcategories]
          if (nextIndex < 0 || nextIndex >= subs.length) return item
          const temp = subs[index]
          subs[index] = subs[nextIndex]
          subs[nextIndex] = temp
          return { ...item, subcategories: subs }
        }
        return item
      })
    )
  }

  // --- Form Editing ---
  function editParent(item: MenuItem) {
    setActiveChildEdit(null)
    setActiveParentEdit(item.id)
    let linkType = 'custom'
    if (item.slug && item.slug.startsWith('/category/')) {
      linkType = 'category'
    } else if (item.slug && item.slug.startsWith('/product/')) {
      linkType = 'product'
    }
    setEditForm({ name: item.name, slug: item.slug, linkType })
  }

  function saveParentEdit(parentId: string) {
    setMenuItems(
      menuItems.map(item => {
        if (item.id === parentId) {
          return {
            ...item,
            name: editForm.name,
            slug: editForm.slug.trim()
          }
        }
        return item
      })
    )
    setActiveParentEdit(null)
  }

  function editChild(parentId: string, sub: any) {
    setActiveParentEdit(null)
    setActiveChildEdit({ parentId, childId: sub.id })
    let linkType = 'custom'
    if (sub.slug && sub.slug.startsWith('/category/')) {
      linkType = 'category'
    } else if (sub.slug && sub.slug.startsWith('/product/')) {
      linkType = 'product'
    }
    setEditForm({ name: sub.name, slug: sub.slug, linkType })
  }

  function saveChildEdit(parentId: string, childId: string) {
    setMenuItems(
      menuItems.map(item => {
        if (item.id === parentId) {
          return {
            ...item,
            subcategories: item.subcategories.map(sub =>
              sub.id === childId
                ? {
                    ...sub,
                    name: editForm.name,
                    slug: editForm.slug.trim()
                  }
                : sub
            )
          }
        }
        return item
      })
    )
    setActiveChildEdit(null)
  }

  return (
    <div className="p-8 font-light max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light uppercase tracking-wide" style={{ color: '#1B4332' }}>Navigation Menu</h1>
          <p className="text-xs text-gray-500 mt-1">Design and customize exactly how links and dropdowns display on the storefront navbar</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={addParentItem}
            className="px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider font-normal flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 transition-all"
            style={{ color: '#1B4332' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Main Link
          </button>
          <button
            onClick={saveMenu}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-normal flex items-center gap-2 transition-all disabled:opacity-60"
            style={{ background: '#1B4332', color: '#E3BA45' }}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-gray-400">Loading Navigation Menu Settings...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Tree Editor */}
          <div className="lg:col-span-2 space-y-4">
            {menuItems.length === 0 ? (
              <div className="p-12 border border-dashed border-gray-200 rounded-2xl text-center text-gray-400 text-xs">
                No links configured. Click "Add Main Link" to build your navbar.
              </div>
            ) : (
              menuItems.map((item, parentIdx) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border transition-all ${
                    activeParentEdit === item.id ? 'border-emerald-600 ring-2 ring-emerald-50' : 'border-gray-150 hover:border-gray-300'
                  }`}
                >
                  {/* Parent Row */}
                  <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-t-2xl border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      {/* Movement */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          disabled={parentIdx === 0}
                          onClick={() => moveParent(parentIdx, 'up')}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" strokeWidth={2.5} /></svg>
                        </button>
                        <button
                          disabled={parentIdx === menuItems.length - 1}
                          onClick={() => moveParent(parentIdx, 'down')}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth={2.5} /></svg>
                        </button>
                      </div>

                      {/* Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-normal text-sm" style={{ color: '#1B4332' }}>{item.name}</span>
                          {!item.visible && (
                            <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-light">Hidden</span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">Link Slug: {item.slug || '(Unassigned)'}</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleParentVisible(item.id)}
                        className={`p-1.5 rounded-lg border hover:bg-white transition-all ${item.visible ? 'text-gray-500 border-gray-100' : 'text-amber-600 border-amber-100 bg-amber-50/20'}`}
                        title={item.visible ? 'Hide from navbar' : 'Show on navbar'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.visible ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" : "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"} />
                        </svg>
                      </button>
                      <button
                        onClick={() => editParent(item)}
                        className="p-1.5 rounded-lg border border-gray-100 hover:bg-white text-gray-500 transition-all"
                        title="Edit link details"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button
                        onClick={() => addChildItem(item.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-150 hover:bg-white text-emerald-800 text-[10px] uppercase tracking-wider font-normal flex items-center gap-1"
                        title="Add dropdown item"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        Add Dropdown Item
                      </button>
                      <button
                        onClick={() => deleteParentItem(item.id)}
                        className="p-1.5 rounded-lg border border-red-100 text-red-600 hover:bg-red-50/40 transition-all"
                        title="Delete item"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Dropdowns list inside parent */}
                  <div className="p-4 space-y-2 border-t border-gray-50">
                    {item.subcategories.length === 0 ? (
                      <div className="py-2.5 text-center text-gray-400 italic text-[11px]">
                        No dropdown submenu items. Displays as a direct header link.
                      </div>
                    ) : (
                      item.subcategories.map((sub, childIdx) => (
                        <div
                          key={sub.id}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            activeChildEdit?.childId === sub.id
                              ? 'border-emerald-600 bg-emerald-50/10 ring-1 ring-emerald-600/30'
                              : 'border-gray-100 bg-white hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Movement */}
                            <div className="flex flex-col gap-0.5">
                              <button
                                disabled={childIdx === 0}
                                onClick={() => moveChild(item.id, childIdx, 'up')}
                                className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" strokeWidth={2.5} /></svg>
                              </button>
                              <button
                                disabled={childIdx === item.subcategories.length - 1}
                                onClick={() => moveChild(item.id, childIdx, 'down')}
                                className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth={2.5} /></svg>
                              </button>
                            </div>

                            {/* Dropdown item details */}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-normal text-xs text-gray-700">{sub.name}</span>
                                {!sub.visible && (
                                  <span className="text-[8px] bg-gray-50 text-gray-400 px-1 py-0.2 rounded-full uppercase tracking-wider font-light">Hidden</span>
                                )}
                              </div>
                              <span className="text-[9px] text-gray-400 font-mono">Link Slug: {sub.slug || '(Unassigned)'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleChildVisible(item.id, sub.id)}
                              className={`p-1 rounded border hover:bg-gray-50 transition-all ${sub.visible ? 'text-gray-400 border-gray-100' : 'text-amber-600 border-amber-100 bg-amber-50/20'}`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={sub.visible ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" : "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"} />
                              </svg>
                            </button>
                            <button
                              onClick={() => editChild(item.id, sub)}
                              className="p-1 rounded border border-gray-100 text-gray-400 hover:bg-gray-50 transition-all"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button
                              onClick={() => deleteChildItem(item.id, sub.id)}
                              className="p-1 rounded border border-red-50 text-red-500 hover:bg-red-50/20 transition-all"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Edit Details Sidebar */}
          <div className="lg:col-span-1">
            {activeParentEdit === null && activeChildEdit === null ? (
              <div className="bg-gray-50 rounded-2xl border border-gray-150 p-6 text-center text-gray-400 text-xs italic">
                Select a menu item or dropdown link to edit its name, link destination, and target category.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-150 p-6 space-y-5 shadow-xs sticky top-8">
                <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                  <h3 className="font-normal text-sm" style={{ color: '#1B4332' }}>
                    {activeParentEdit ? 'Edit Main Link' : 'Edit Dropdown Item'}
                  </h3>
                  <button
                    onClick={() => {
                      setActiveParentEdit(null)
                      setActiveChildEdit(null)
                    }}
                    className="text-gray-400 hover:text-gray-600 text-xs"
                  >
                    Cancel
                  </button>
                </div>

                {/* Name Form */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-1.5">Link Display Label</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 outline-none focus:border-emerald-700 font-light"
                    placeholder="e.g. Vintage Rings"
                  />
                </div>

                {/* Link Type Selector */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-1.5">Destination Link</label>
                  <div className="grid grid-cols-3 gap-1 mb-2.5">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, linkType: 'category', slug: categories[0]?.slug || '' })}
                      className={`py-2 text-center text-[9px] uppercase tracking-wider rounded-lg border font-normal transition-all ${
                        editForm.linkType === 'category' ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 font-semibold' : 'border-gray-200 text-gray-500 bg-white'
                      }`}
                    >
                      Category
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, linkType: 'product', slug: products[0] ? `/product/${products[0].id}` : '' })}
                      className={`py-2 text-center text-[9px] uppercase tracking-wider rounded-lg border font-normal transition-all ${
                        editForm.linkType === 'product' ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 font-semibold' : 'border-gray-200 text-gray-500 bg-white'
                      }`}
                    >
                      Product
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, linkType: 'custom', slug: '' })}
                      className={`py-2 text-center text-[9px] uppercase tracking-wider rounded-lg border font-normal transition-all ${
                        editForm.linkType === 'custom' ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 font-semibold' : 'border-gray-200 text-gray-500 bg-white'
                      }`}
                    >
                      Custom Link
                    </button>
                  </div>

                  {editForm.linkType === 'category' && (
                    <select
                      value={editForm.slug}
                      onChange={e => setEditForm({ ...editForm, slug: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white outline-none focus:border-emerald-700 font-light"
                    >
                      <option value="">-- Choose Category --</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.slug}>
                          {c.name} ({c.slug})
                        </option>
                      ))}
                    </select>
                  )}

                  {editForm.linkType === 'product' && (
                    <select
                      value={editForm.slug}
                      onChange={e => setEditForm({ ...editForm, slug: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white outline-none focus:border-emerald-700 font-light"
                    >
                      <option value="">-- Choose Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={`/product/${p.id}`}>
                          {p.title} (/product/{p.id})
                        </option>
                      ))}
                    </select>
                  )}

                  {editForm.linkType === 'custom' && (
                    <input
                      type="text"
                      value={editForm.slug}
                      onChange={e => setEditForm({ ...editForm, slug: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 outline-none focus:border-emerald-700 font-light font-mono"
                      placeholder="e.g. #deals, /pages/about, etc."
                    />
                  )}
                </div>

                <button
                  onClick={() => {
                    if (activeParentEdit) {
                      saveParentEdit(activeParentEdit)
                    } else if (activeChildEdit) {
                      saveChildEdit(activeChildEdit.parentId, activeChildEdit.childId)
                    }
                  }}
                  disabled={!editForm.name}
                  className="w-full py-2.5 rounded-xl text-xs uppercase tracking-wider font-normal transition-all text-white hover:opacity-95"
                  style={{ background: '#1B4332' }}
                >
                  Apply Changes
                </button>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
