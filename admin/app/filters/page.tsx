'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useNotification } from '@/components/NotificationProvider'

type Category = { id: string; name: string; slug: string }
type FilterGroup = { id: string; name: string; slug: string; is_enabled: boolean; display_order: number }
type FilterValue = { id: string; filter_group_id: string; value: string }
type CategoryFilter = { category_id: string; filter_group_id: string }

export default function FiltersPage() {
  const { showToast, showConfirm } = useNotification()
  const [categories, setCategories] = useState<Category[]>([])
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([])
  const [filterValues, setFilterValues] = useState<FilterValue[]>([])
  const [categoryFilters, setCategoryFilters] = useState<CategoryFilter[]>([])
  const [activeTab, setActiveTab] = useState<'groups' | 'categories'>('groups')
  
  // Modals / forms state
  const [groupModal, setGroupModal] = useState<'add' | 'edit' | null>(null)
  const [groupForm, setGroupForm] = useState({ id: '', name: '', slug: '', is_enabled: true, display_order: 0 })
  const [newValueInput, setNewValueInput] = useState<{ [groupId: string]: string }>({})
  const [saving, setSaving] = useState(false)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [catRes, groupRes, valRes, mappingRes] = await Promise.all([
      supabase.from('categories').select('*').order('display_order'),
      supabase.from('filter_groups').select('*').order('display_order'),
      supabase.from('filter_values').select('*').order('created_at'),
      supabase.from('category_filters').select('*')
    ])
    
    setCategories(catRes.data || [])
    setFilterGroups(groupRes.data || [])
    setFilterValues(valRes.data || [])
    setCategoryFilters(mappingRes.data || [])
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // --- FILTER GROUP CRUD ---
  function openAddGroup() {
    setGroupForm({ id: '', name: '', slug: '', is_enabled: true, display_order: filterGroups.length + 1 })
    setGroupModal('add')
  }

  function openEditGroup(g: FilterGroup) {
    setGroupForm({ ...g })
    setGroupModal('edit')
  }

  async function saveGroup() {
    setSaving(true)
    const payload = {
      name: groupForm.name,
      slug: groupForm.slug.toLowerCase().replace(/\s+/g, '-'),
      is_enabled: groupForm.is_enabled,
      display_order: parseInt(groupForm.display_order as any) || 0
    }
    
    let res
    if (groupModal === 'add') {
      res = await supabase.from('filter_groups').insert([payload])
    } else {
      res = await supabase.from('filter_groups').update(payload).eq('id', groupForm.id)
    }

    if (res.error) {
      showToast(`Error saving filter group: ${res.error.message}`, { type: 'error' })
    } else {
      showToast('Filter group saved successfully!', { type: 'success' })
      setGroupModal(null)
      loadData()
    }
    setSaving(false)
  }

  async function delGroup(id: string) {
    const confirmed = await showConfirm('Are you sure you want to delete this filter group? All associated values and product assignments will be deleted.')
    if (!confirmed) return
    const { error } = await supabase.from('filter_groups').delete().eq('id', id)
    if (error) {
      showToast(`Error deleting filter group: ${error.message}`, { type: 'error' })
    } else {
      showToast('Filter group deleted successfully!', { type: 'success' })
    }
    loadData()
  }

  async function toggleGroupEnabled(g: FilterGroup) {
    const { error } = await supabase.from('filter_groups').update({ is_enabled: !g.is_enabled }).eq('id', g.id)
    if (error) {
      showToast(`Error toggling filter status: ${error.message}`, { type: 'error' })
    } else {
      showToast(`Filter group ${!g.is_enabled ? 'enabled' : 'disabled'}!`, { type: 'success' })
    }
    loadData()
  }

  // --- FILTER VALUE CRUD ---
  async function addValue(groupId: string) {
    const val = newValueInput[groupId]?.trim()
    if (!val) return
    
    const { error } = await supabase.from('filter_values').insert([{
      filter_group_id: groupId,
      value: val
    }])
    
    if (error) {
      showToast(`Error adding filter value: ${error.message}`, { type: 'error' })
    } else {
      showToast('Filter value added successfully!', { type: 'success' })
      setNewValueInput({ ...newValueInput, [groupId]: '' })
      loadData()
    }
  }

  async function delValue(valueId: string) {
    const confirmed = await showConfirm('Are you sure you want to delete this filter value?')
    if (!confirmed) return
    const { error } = await supabase.from('filter_values').delete().eq('id', valueId)
    if (error) {
      showToast(`Error deleting filter value: ${error.message}`, { type: 'error' })
    } else {
      showToast('Filter value deleted successfully!', { type: 'success' })
    }
    loadData()
  }

  // --- CATEGORY FILTER MAPPING ---
  async function toggleCategoryFilter(catId: string, groupId: string, isAssigned: boolean) {
    if (isAssigned) {
      // Remove assignment
      const { error } = await supabase
        .from('category_filters')
        .delete()
        .eq('category_id', catId)
        .eq('filter_group_id', groupId)
      
      if (error) {
        showToast(`Error removing category filter: ${error.message}`, { type: 'error' })
      } else {
        showToast('Category filter assignment removed.', { type: 'success' })
      }
    } else {
      // Add assignment
      const { error } = await supabase
        .from('category_filters')
        .insert([{ category_id: catId, filter_group_id: groupId }])
      
      if (error) {
        showToast(`Error assigning category filter: ${error.message}`, { type: 'error' })
      } else {
        showToast('Category filter assigned successfully!', { type: 'success' })
      }
    }
    loadData()
  }

  return (
    <div className="p-8 font-light max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light uppercase tracking-wide" style={{ color: '#1B4332' }}>Dynamic Filters</h1>
          <p className="text-xs text-gray-500 mt-1">Manage e-commerce product filter groups, values, and assign them per collection</p>
        </div>
        {activeTab === 'groups' && (
          <button onClick={openAddGroup} className="px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-normal flex items-center gap-2" style={{ background: '#1B4332', color: '#E3BA45' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
            Add Filter Group
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('groups')}
          className="px-6 py-3 text-xs uppercase tracking-widest font-normal border-b-2 transition-all"
          style={{
            borderColor: activeTab === 'groups' ? '#1B4332' : 'transparent',
            color: activeTab === 'groups' ? '#1B4332' : '#9ca3af'
          }}
        >
          Filter Groups & Values ({filterGroups.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className="px-6 py-3 text-xs uppercase tracking-widest font-normal border-b-2 transition-all"
          style={{
            borderColor: activeTab === 'categories' ? '#1B4332' : 'transparent',
            color: activeTab === 'categories' ? '#1B4332' : '#9ca3af'
          }}
        >
          Category Assignments
        </button>
      </div>

      {/* Tab: Groups & Values */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          {filterGroups.map(g => {
            const values = filterValues.filter(v => v.filter_group_id === g.id)
            const isExpanded = expandedGroup === g.id
            
            return (
              <div key={g.id} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden transition-all duration-300">
                {/* Header Row */}
                <div 
                  onClick={() => setExpandedGroup(isExpanded ? null : g.id)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-all select-none"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-1 rounded-lg">Order: {g.display_order}</span>
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-950 capitalize">{g.name}</h4>
                      <code className="text-[10px] text-gray-400 font-mono">slug: {g.slug}</code>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
                    <span className="text-xs text-gray-500">{values.length} values</span>
                    
                    {/* Status Toggle */}
                    <button 
                      onClick={() => toggleGroupEnabled(g)} 
                      className={`w-9 h-5 rounded-full transition-all relative ${g.is_enabled ? 'bg-emerald-600' : 'bg-gray-200'}`}
                      title={g.is_enabled ? 'Enabled' : 'Disabled'}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${g.is_enabled ? 'left-4.5' : 'left-0.5'}`} />
                    </button>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditGroup(g)}
                        className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:border-emerald-600 hover:text-emerald-700 transition-all"
                        title="Edit Filter Group"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button
                        onClick={() => delGroup(g.id)}
                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                        title="Delete Filter Group"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>

                    {/* Caret Icon */}
                    <svg 
                      className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      onClick={() => setExpandedGroup(isExpanded ? null : g.id)}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Values Panel (Collapsible) */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-gray-50 bg-gray-50/50">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Available Values</span>
                    
                    {/* Values tags grid */}
                    <div className="flex flex-wrap gap-2 mt-2 mb-4">
                      {values.map(val => (
                        <span key={val.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-light bg-white border border-gray-200 text-gray-700">
                          {val.value}
                          <button 
                            onClick={() => delValue(val.id)} 
                            className="text-gray-400 hover:text-red-600 font-semibold focus:outline-none"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                      {values.length === 0 && (
                        <span className="text-xs text-gray-400 italic">No values defined yet.</span>
                      )}
                    </div>

                    {/* Add Value Input */}
                    <div className="flex gap-2 max-w-sm">
                      <input
                        type="text"
                        value={newValueInput[g.id] || ''}
                        onChange={e => setNewValueInput({ ...newValueInput, [g.id]: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && addValue(g.id)}
                        className="flex-1 px-3.5 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 bg-white"
                        placeholder="Add new value (e.g. Gold)"
                      />
                      <button 
                        onClick={() => addValue(g.id)} 
                        className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-emerald-900 transition-all text-white"
                        style={{ background: '#1B4332' }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {filterGroups.length === 0 && (
            <div className="py-16 text-center bg-white border border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs">
              No filter groups found. Click Add Filter Group to get started.
            </div>
          )}
        </div>
      )}

      {/* Tab: Category Association */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map(cat => {
            return (
              <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
                <div className="border-b border-gray-50 pb-3">
                  <h4 className="text-sm font-semibold text-emerald-950 capitalize">{cat.name}</h4>
                  <span className="text-[10px] text-gray-400 font-mono">slug: {cat.slug}</span>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Enabled Filters</span>
                  <div className="grid grid-cols-2 gap-2.5">
                    {filterGroups.map(g => {
                      const isAssigned = categoryFilters.some(cf => cf.category_id === cat.id && cf.filter_group_id === g.id)
                      
                      return (
                        <label 
                          key={g.id} 
                          className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                            isAssigned 
                              ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-normal' 
                              : 'border-gray-150 hover:bg-gray-50 text-gray-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => toggleCategoryFilter(cat.id, g.id, isAssigned)}
                            className="w-3.5 h-3.5 accent-emerald-800"
                          />
                          <span>{g.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
          {categories.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white border border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs">
              No categories found. Configure categories first.
            </div>
          )}
        </div>
      )}

      {/* Filter Group Modal */}
      {groupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <h2 className="text-base font-normal tracking-wide uppercase" style={{ color: '#1B4332' }}>
                {groupModal === 'add' ? 'Add Filter Group' : 'Edit Filter Group'}
              </h2>
              <button onClick={() => setGroupModal(null)} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Group Name *</label>
                <input
                  value={groupForm.name}
                  onChange={e => setGroupForm({ ...groupForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-light"
                  placeholder="e.g. Plating"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Slug *</label>
                <input
                  value={groupForm.slug}
                  onChange={e => setGroupForm({ ...groupForm, slug: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-mono text-[11px]"
                  placeholder="e.g. plating"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">Display Order</label>
                <input
                  type="number"
                  value={groupForm.display_order}
                  onChange={e => setGroupForm({ ...groupForm, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-light"
                  placeholder="0"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[10px] uppercase tracking-wider font-medium text-gray-500">Enabled</label>
                <button 
                  type="button" 
                  onClick={() => setGroupForm({ ...groupForm, is_enabled: !groupForm.is_enabled })} 
                  className={`w-10 h-5 rounded-full transition-all relative ${groupForm.is_enabled ? 'bg-emerald-600' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${groupForm.is_enabled ? 'left-5.5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setGroupModal(null)} className="flex-1 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-normal border text-gray-500 hover:bg-gray-50">Cancel</button>
              <button onClick={saveGroup} disabled={saving || !groupForm.name} className="flex-1 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-normal disabled:opacity-60 transition-all" style={{ background: '#1B4332', color: '#E3BA45' }}>
                {saving ? 'Saving...' : groupModal === 'add' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
