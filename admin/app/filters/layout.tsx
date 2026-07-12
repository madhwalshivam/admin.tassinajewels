import Sidebar from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#f8f5f0' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
