'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

type Inquiry = {
  id: string; name: string; company: string | null; email: string; whatsapp: string | null;
  product_id: string | null; product_title: string | null; quantity: number | null;
  message: string | null; status: string; created_at: string;
}

const TABS = ['all', 'pending', 'replied', 'converted', 'cancelled']
const statusColor: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  replied: 'bg-blue-50 text-blue-700 border-blue-100',
  converted: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  cancelled: 'bg-red-50 text-red-700 border-red-100',
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [selected, setSelected] = useState<Inquiry | null>(null)
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('inquiries').select('*').order('created_at', { ascending: false })
    if (tab !== 'all') q = q.eq('status', tab)
    if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
    const { data } = await q
    setInquiries(data || [])
    setLoading(false)
  }, [tab, search])

  useEffect(() => { load() }, [load])

  async function updateStatus(id: string, status: string) {
    await supabase.from('inquiries').update({ status }).eq('id', id)
    setSelected(s => s ? { ...s, status } : null)
    load()
  }

  async function del(id: string) {
    if (!confirm('Are you sure you want to delete this inquiry?')) return
    await supabase.from('inquiries').delete().eq('id', id)
    setSelected(null); load()
  }

  return (
    <div className="flex h-screen overflow-hidden font-light" style={{ background: '#f8f5f0' }}>
      {/* Left Panel */}
      <div className="flex-1 flex flex-col p-8 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-light uppercase tracking-wide" style={{ color: '#1B4332' }}>Inquiries</h1>
            <p className="text-xs text-gray-500 mt-1">Manage B2B wholesale quotation requests</p>
          </div>
          <a href="/api/export" className="px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-normal border transition-all hover:bg-white" style={{ borderColor: '#E3BA45', color: '#C9A82C' }}>
            Export CSV
          </a>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search inquiries..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-light"
          />
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-white rounded-2xl p-1 shadow-sm border border-gray-100 shrink-0">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-xl text-[10px] uppercase tracking-widest font-normal transition-all"
              style={{
                background: tab === t ? '#1B4332' : 'transparent',
                color: tab === t ? '#E3BA45' : '#6b7280'
              }}>
              {t}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-xs">Loading inquiries...</div>
          ) : inquiries.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">No inquiries found in this filter.</div>
          ) : inquiries.map(inq => (
            <div key={inq.id} onClick={() => setSelected(inq)}
              className="bg-white rounded-2xl p-5 border cursor-pointer transition-all hover:shadow-md"
              style={{
                borderColor: selected?.id === inq.id ? '#E3BA45' : '#e5e7eb',
                borderWidth: selected?.id === inq.id ? 2 : 1
              }}>
              <div className="flex items-start justify-between mb-1.5">
                <span className="font-normal text-sm" style={{ color: '#1B4332' }}>{inq.name}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold border ${statusColor[inq.status] || 'bg-gray-100 text-gray-600'}`}>
                  {inq.status}
                </span>
              </div>
              <div className="text-xs text-gray-500 font-light">{inq.email}</div>
              {inq.product_title && (
                <div className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2z" />
                  </svg>
                  {inq.product_title}
                </div>
              )}
              <div className="text-[10px] text-gray-400 mt-2 font-mono">{new Date(inq.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Detail Panel */}
      {selected ? (
        <div className="w-96 bg-white border-l border-gray-100 p-8 overflow-y-auto shrink-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-normal text-base uppercase tracking-wider" style={{ color: '#1B4332' }}>Inquiry Detail</h2>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 mb-6">
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold border ${statusColor[selected.status] || 'bg-gray-100'}`}>
                {selected.status}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">{new Date(selected.created_at).toLocaleString()}</span>
            </div>

            {/* Info list */}
            <div className="space-y-4 mb-8">
              {[
                { label: 'Name', value: selected.name },
                { label: 'Company', value: selected.company },
                { label: 'Email', value: selected.email },
                { label: 'WhatsApp', value: selected.whatsapp },
                { label: 'Product Requested', value: selected.product_title },
                { label: 'Quantity Required', value: selected.quantity ? `${selected.quantity} pcs` : null },
              ].map(({ label, value }) => value ? (
                <div key={label} className="border-b border-gray-50 pb-2">
                  <p className="text-[10px] uppercase tracking-wider font-medium text-gray-400 mb-0.5">{label}</p>
                  <p className="text-xs font-normal" style={{ color: '#1B4332' }}>{value}</p>
                </div>
              ) : null)}
              {selected.message && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-medium text-gray-400 mb-1.5">Message / Requirements</p>
                  <p className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-100 font-light leading-relaxed whitespace-pre-wrap">{selected.message}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            {/* Quick Actions */}
            <div className="space-y-2 mb-4">
              {selected.whatsapp && (
                <a
                  href={`https://wa.me/${selected.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs uppercase tracking-wider font-normal bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.733-1.458L0 24zm6.75-2.085l.412.245c1.472.873 3.12 1.334 4.82 1.335 5.513 0 10.017-4.503 10.02-10.02.001-2.673-1.04-5.184-2.93-7.078-1.89-1.894-4.404-2.937-7.078-2.938-5.524 0-10.028 4.504-10.03 10.023-.001 1.79.47 3.535 1.365 5.06l.265.453L1.966 22.07l4.84-1.267zM16.92 14.1c-.266-.134-1.57-.775-1.815-.865-.24-.09-.418-.135-.592.135-.175.27-.678.86-.83 1.03-.153.18-.307.2-.573.067-.267-.134-1.127-.415-2.147-1.326-.79-.705-1.326-1.576-1.48-1.846-.153-.27-.016-.417.118-.55.123-.12.266-.315.4-.472.13-.157.177-.262.267-.44.09-.177.043-.33-.02-.465-.067-.134-.59-1.42-.81-1.947-.213-.512-.45-.442-.617-.45-.16-.008-.34-.01-.52-.01s-.47.067-.716.34c-.247.27-.94.92-.94 2.246 0 1.327.964 2.61 1.1 2.79.13.18 1.9 2.9 4.6 4.07.64.28 1.14.44 1.53.57.65.2 1.23.18 1.69.11.51-.08 1.57-.64 1.79-1.26.22-.62.22-1.15.15-1.26-.06-.11-.23-.17-.49-.3z"/>
                  </svg>
                  WhatsApp Reply
                </a>
              )}
              <a
                href={`mailto:${selected.email}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs uppercase tracking-wider font-normal border transition-all hover:bg-gray-50"
                style={{ borderColor: '#3B82F6', color: '#2563EB' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Email
              </a>
            </div>

            {/* Status Buttons */}
            <div className="border-t border-gray-100 pt-4 mb-4">
              <p className="text-[10px] uppercase tracking-wider font-medium text-gray-400 mb-2.5">Update Status</p>
              <div className="grid grid-cols-2 gap-2">
                {['pending', 'replied', 'converted', 'cancelled'].map(s => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)}
                    className={`py-2 rounded-xl text-[10px] uppercase tracking-wider font-normal transition-all ${selected.status === s ? 'opacity-40 cursor-default' : 'hover:opacity-80'}`}
                    style={{
                      background: s === 'converted' ? '#10B981' : s === 'cancelled' ? '#EF4444' : s === 'replied' ? '#3B82F6' : '#F59E0B',
                      color: '#fff'
                    }}
                    disabled={selected.status === s}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => del(selected.id)} className="w-full py-2.5 rounded-xl text-xs uppercase tracking-wider font-normal bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Inquiry
            </button>
          </div>
        </div>
      ) : (
        <div className="w-96 bg-white border-l border-gray-100 flex items-center justify-center shrink-0">
          <div className="text-center text-gray-300">
            <svg className="w-12 h-12 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-xs uppercase tracking-wider">Select an inquiry</p>
          </div>
        </div>
      )}
    </div>
  )
}
