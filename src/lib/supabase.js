import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Bucket de Storage donde se guardan las fotos de productos
export const STORAGE_BUCKET = 'productos'

// Bucket PRIVADO de los comprobantes de pago (solo el admin los ve)
export const COMPROBANTES_BUCKET = 'comprobantes'
