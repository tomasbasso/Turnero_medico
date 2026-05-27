import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client (for storage uploads from the browser)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client with service role (for admin operations)
export function createServiceClient() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function uploadAvatar(
  file: File,
  doctorId: number,
): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `avatars/doctor-${doctorId}.${ext}`

  const { error } = await supabase.storage
    .from('turnero')
    .upload(path, file, { upsert: true })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('turnero').getPublicUrl(path)
  return data.publicUrl
}
