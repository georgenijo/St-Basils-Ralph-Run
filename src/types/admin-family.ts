export interface AdminFamily {
  id: string
  family_name: string
  phone: string | null
  address: string | null
  membership_status: 'active' | 'expired' | 'pending'
  membership_type: 'monthly' | 'annual' | null
  membership_expires_at: string | null
  head_of_household: string | null
  created_at: string
  updated_at: string
  member_count: number
}

export interface FamilyProfile {
  id: string
  email: string | null
  full_name: string | null
  role: string
  is_active: boolean
  family_id: string | null
}

export interface FamilyOption {
  id: string
  family_name: string
}
