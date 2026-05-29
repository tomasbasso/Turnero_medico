import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Only initialize if the URL looks real (prevents crash when env vars are still placeholders)
const supabaseConfigured =
  supabaseUrl.startsWith('https://') && !supabaseUrl.includes('[')

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Server-side Supabase client with service role (for admin operations)
export function createServiceClient() {
  if (!supabaseConfigured) throw new Error('Supabase Storage no configurado')
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function uploadAvatar(
  file: File,
  doctorId: number,
): Promise<string> {
  if (!supabase) throw new Error('Supabase Storage no configurado. Agregá NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY al .env')

  const ext = file.name.split('.').pop()
  const path = `avatars/doctor-${doctorId}.${ext}`

  const { error } = await supabase.storage
    .from('turnero')
    .upload(path, file, { upsert: true })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('turnero').getPublicUrl(path)
  return data.publicUrl
}
