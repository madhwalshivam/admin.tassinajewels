'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/dashboard')
    } else {
      setError('Invalid password. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center font-light" style={{ background: '#f8f5f0' }}>
      <div className="w-full max-w-md px-4">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 overflow-hidden border-2 shadow-sm" style={{ borderColor: '#E3BA45' }}>
            <img src="/logo.jpg" alt="Tassina Jewels Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-light tracking-wide uppercase" style={{ color: '#1B4332' }}>Tassina Jewels</h1>
          <p className="text-xs tracking-wider text-gray-500 uppercase mt-1">B2B Wholesale Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
          <h2 className="text-base font-normal tracking-wide uppercase mb-6" style={{ color: '#1B4332' }}>Sign In</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-medium mb-1.5" style={{ color: '#1B4332' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl text-sm outline-none transition-all font-light"
                style={{ borderColor: password ? '#E3BA45' : '' }}
              />
            </div>
            {error && <p className="text-red-500 text-xs font-light">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-normal text-xs uppercase tracking-widest transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: '#1B4332', color: '#E3BA45' }}
            >
              {loading ? 'Verifying...' : (
                <>
                  Enter Portal
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
        <p className="text-center text-[10px] tracking-widest text-gray-400 uppercase mt-6">Tassina Jewels &copy; 2024</p>
      </div>
    </div>
  )
}
