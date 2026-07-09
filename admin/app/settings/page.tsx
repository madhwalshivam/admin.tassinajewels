'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface StyleCard { title: string; image: string; filter: string }
interface HeroSlide { image: string; link_url: string }

function formatImageUrl(url: string | null): string {
  if (!url) return ''
  if (url.includes('/dfix/')) {
    const parts = url.split('/dfix/')
    return `/api/image/dfix/${parts[1]}`
  }
  return url
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'hero'|'announcement'|'style'|'general'>('hero')

  const [settings, setSettings] = useState({
    announcement_text: '',
    announcement_link: '',
    announcement_show: 'true',
    whatsapp_number: '',
    admin_domain: '',
  })

  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([
    { image: '', link_url: '' }
  ])

  const [styleCards, setStyleCards] = useState<StyleCard[]>([
    { title: 'Modern Fusion', image: '', filter: 'all' },
    { title: 'Heritage', image: '', filter: 'all' },
    { title: 'Classic Traditional', image: '', filter: 'all' },
    { title: 'Contemporary Chic', image: '', filter: 'all' },
  ])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('storefront_settings').select('*')
      if (data) {
        const m: any = {}
        data.forEach((r: any) => { m[r.key] = r.value })
        setSettings(s => ({
          ...s,
          announcement_text: m.announcement_text || '',
          announcement_link: m.announcement_link || '',
          announcement_show: m.announcement_show || 'true',
          whatsapp_number: m.whatsapp_number || '',
          admin_domain: m.admin_domain || '',
        }))
        if (m.hero_slides) {
          try {
            const parsed = JSON.parse(m.hero_slides)
            if (Array.isArray(parsed)) {
              const migrated = parsed.map((slide: any) => ({
                image: slide.image || slide.desktop_image || slide.mobile_image || '',
                link_url: slide.link_url || ''
              }))
              setHeroSlides(migrated)
            }
          } catch {}
        }
        if (m.style_cards) {
          try { setStyleCards(JSON.parse(m.style_cards)) } catch {}
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  async function save() {
    setSaving(true)
    const entries: any[] = [
      ...Object.entries(settings).map(([key, value]) => ({ key, value })),
      { key: 'hero_slides', value: JSON.stringify(heroSlides) },
      { key: 'style_cards', value: JSON.stringify(styleCards) },
    ]
    await Promise.all(entries.map(e =>
      supabase.from('storefront_settings').upsert(e, { onConflict: 'key' })
    ))
    setSaving(false)
    alert('✅ Settings saved! Reload the storefront to see changes.')
  }

  const tabStyle = (t: string) => ({
    padding: '8px 18px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px',
    background: tab === t ? '#1B4332' : '#fff',
    color: tab === t ? '#E3BA45' : '#6b7280',
    transition: 'all 0.2s',
  })

  const field = (label: string, hint: string, value: string, key: keyof typeof settings, placeholder = '') => (
    <div>
      <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5 text-gray-500">{label}</label>
      <input
        value={value}
        onChange={e => setSettings({ ...settings, [key]: e.target.value })}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-yellow-400 font-mono"
        placeholder={placeholder}
      />
      {hint && <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{hint}</p>}
    </div>
  )

  return (
    <div className="p-8 font-light max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-light uppercase tracking-wide" style={{ color: '#1B4332' }}>Storefront Settings</h1>
        <p className="text-xs text-gray-500 mt-1">Manage hero banners, announcement bar, and shop sections</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1.5 bg-gray-100 rounded-xl w-fit">
        {(['hero','announcement','style','general'] as const).map(t => (
          <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>{t === 'style' ? 'Shop Style' : t.charAt(0).toUpperCase()+t.slice(1)}</button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center text-gray-400 text-xs">Loading settings...</div>
      ) : (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm space-y-6">

          {/* HERO TAB */}
          {tab === 'hero' && (
            <>
              <div className="p-4 rounded-xl border border-yellow-100 bg-yellow-50">
                <p className="text-[10px] text-yellow-800 font-medium uppercase tracking-wide mb-1">📐 Recommended Image Sizes</p>
                <p className="text-[10px] text-yellow-700">Desktop Image: <strong>1920 × 600 px</strong> (landscape, wide)</p>
                <p className="text-[10px] text-yellow-700 mt-0.5">Mobile Image: <strong>768 × 900 px</strong> (portrait, tall)</p>
                <p className="text-[10px] text-yellow-700 mt-1">Upload images to Cloudinary → copy Direct URL → paste below</p>
              </div>

              <div className="space-y-6">
                {heroSlides.map((slide, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50/40 relative">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Hero Slide {i + 1}</span>
                      {heroSlides.length > 1 && (
                        <button
                          onClick={() => setHeroSlides(slides => slides.filter((_, idx) => idx !== i))}
                          className="text-[10px] text-red-500 hover:text-red-700 uppercase tracking-wider font-semibold"
                        >Remove</button>
                      )}
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider font-medium mb-1.5 text-gray-400">Slide Image</label>
                      <input
                        value={slide.image}
                        onChange={e => { const s=[...heroSlides]; s[i]={...s[i],image:e.target.value}; setHeroSlides(s); }}
                        placeholder="Paste secure image URL (e.g. https://res.cloudinary.com/...)"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-yellow-400 font-mono"
                      />
                      {slide.image && slide.image !== 'Uploading...' && (
                        <div className="mt-2 relative w-full h-32 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                          <img src={formatImageUrl(slide.image)} alt="Slide preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider font-medium mb-1 text-gray-400">Link URL (optional)</label>
                      <input
                        value={slide.link_url}
                        onChange={e => { const s=[...heroSlides]; s[i]={...s[i],link_url:e.target.value}; setHeroSlides(s); }}
                        placeholder="e.g. /?category=rings or https://..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setHeroSlides(s => [...s, { image: '', link_url: '' }])}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-yellow-300 hover:text-yellow-600 transition-all uppercase tracking-wider font-semibold"
              >+ Add New Slide</button>
            </>
          )}

          {/* ANNOUNCEMENT TAB */}
          {tab === 'announcement' && (
            <>
              <div className="p-4 rounded-xl border border-green-100 bg-green-50">
                <p className="text-[10px] text-green-800 font-medium uppercase tracking-wide mb-1">ℹ️ Announcement Bar</p>
                <p className="text-[10px] text-green-700">This bar appears at the top of the storefront above the navbar. Toggle it on/off and customize the text and link.</p>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-[10px] uppercase tracking-wider font-medium text-gray-500">Show Announcement Bar</label>
                <button
                  onClick={() => setSettings(s => ({ ...s, announcement_show: s.announcement_show === 'true' ? 'false' : 'true' }))}
                  className="px-4 py-2 rounded-lg text-[10px] uppercase tracking-wider font-medium transition-all"
                  style={{ background: settings.announcement_show === 'true' ? '#1B4332' : '#f3f4f6', color: settings.announcement_show === 'true' ? '#E3BA45' : '#6b7280' }}
                >
                  {settings.announcement_show === 'true' ? '✓ Visible' : '✗ Hidden'}
                </button>
              </div>

              {field('Announcement Text',
                'Short promotional text, shown in uppercase. E.g. "Free Global Delivery on Orders Over $500"',
                settings.announcement_text, 'announcement_text',
                'Free Global Delivery on Orders Over $500')}

              {field('Announcement Link (optional)',
                'Where to send visitors when they click the announcement. Leave blank for no link.',
                settings.announcement_link, 'announcement_link',
                'https://... or /pages/...')}
            </>
          )}

          {/* SHOP BY STYLE TAB */}
          {tab === 'style' && (
            <>
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50">
                <p className="text-[10px] text-blue-800 font-medium uppercase tracking-wide mb-1">🎨 Shop by Style Section</p>
                <p className="text-[10px] text-blue-700">Add style cards shown in the "Shop by Style" section. Each card has a title, image URL, and optional category filter slug.</p>
              </div>

              <div className="space-y-4">
                {styleCards.map((card, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase tracking-wider font-medium text-gray-500">Style Card {i + 1}</span>
                      <button
                        onClick={() => setStyleCards(cards => cards.filter((_, idx) => idx !== i))}
                        className="text-[10px] text-red-400 hover:text-red-600 uppercase tracking-wider"
                      >Remove</button>
                    </div>
                    <input
                      value={card.title}
                      onChange={e => { const c=[...styleCards]; c[i]={...c[i],title:e.target.value}; setStyleCards(c); }}
                      placeholder="Style name (e.g. Modern Fusion)"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-yellow-400"
                    />
                    <input
                      value={card.image}
                      onChange={e => { const c=[...styleCards]; c[i]={...c[i],image:e.target.value}; setStyleCards(c); }}
                      placeholder="Image URL (Cloudinary, 600×800px recommended)"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-yellow-400 font-mono"
                    />
                    <input
                      value={card.filter}
                      onChange={e => { const c=[...styleCards]; c[i]={...c[i],filter:e.target.value}; setStyleCards(c); }}
                      placeholder="Category filter slug (e.g. rings, bracelets — or 'all')"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-yellow-400"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStyleCards(c => [...c, { title: '', image: '', filter: 'all' }])}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-yellow-300 hover:text-yellow-600 transition-all uppercase tracking-wider"
              >+ Add Style Card</button>
            </>
          )}

          {/* GENERAL TAB */}
          {tab === 'general' && (
            <>
              {field('WhatsApp Business Number',
                'Include country code. E.g. +919876543210 — powers all WhatsApp CTAs.',
                settings.whatsapp_number, 'whatsapp_number', '+91...')}
              {field('Admin Dashboard URL',
                'The URL of your admin panel (e.g. https://admin.tassinajewels.com or http://localhost:3000)',
                settings.admin_domain, 'admin_domain', 'https://admin...')}
            </>
          )}

          <div className="pt-4 border-t border-gray-50 flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="px-6 py-3 rounded-xl text-[10px] uppercase tracking-widest disabled:opacity-60 transition-all flex items-center gap-2"
              style={{ background: '#1B4332', color: '#E3BA45' }}
            >
              {saving ? 'Saving...' : '✓ Save All Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
