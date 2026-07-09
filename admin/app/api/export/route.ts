import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { data } = await supabaseAdmin
    .from('inquiries')
    .select('*, products(title)')
    .order('created_at', { ascending: false })

  if (!data) return NextResponse.json({ error: 'No data' }, { status: 500 })

  const headers = ['ID', 'Date', 'Name', 'Company', 'Email', 'WhatsApp', 'Product', 'Quantity', 'Message', 'Status']
  const rows = data.map((i: any) => [
    i.id, new Date(i.created_at).toLocaleDateString(),
    i.name, i.company || '', i.email, i.whatsapp || '',
    i.product_title || '', i.quantity || '', (i.message || '').replace(/,/g, ';'), i.status
  ])

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="inquiries.csv"',
    },
  })
}
