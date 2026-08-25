export interface User {
  id: string
  email: string | null
  full_name: string | null
  role: string
  is_active: boolean
  family_id: string | null
  created_at: string
  updated_at: string
  email_confirmed_at?: string | null
}
