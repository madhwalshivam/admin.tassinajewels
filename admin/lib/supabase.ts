import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://swsuqdnwehrdsriyzmkk.supabase.co'
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3c3VxZG53ZWhyZHNyaXl6bWtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MDQ5OTYsImV4cCI6MjA5ODk4MDk5Nn0.ykaP_QfX0RdSEwuhlXRcUZNWnOcUAWso_NSqQMQ0eZU'
const service = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3c3VxZG53ZWhyZHNyaXl6bWtrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQwNDk5NiwiZXhwIjoyMDk4OTgwOTk2fQ.5FwLL0eLcBmklkl4SVcMryzAv4eSx4BiQpTMuA1pE10'

// Public client is safe everywhere
export const supabase = createClient(url, anon)

// Admin client should only be created if service key is available (server side)
// If in browser, fallback to public client to avoid errors
export const supabaseAdmin = typeof window === 'undefined'
  ? createClient(url, service)
  : supabase


