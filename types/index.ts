// types/index.ts

// =============================================
// DATABASE TYPES
// =============================================

export type PlanType = 'free' | 'solo' | 'professional' | 'team'
export type FormStatus = 'processing' | 'ready' | 'error'
export type FormType = 'pdf_overlay' | 'web_form'
export type FieldType =
  | 'text' | 'email' | 'phone' | 'date' | 'number'
  | 'textarea' | 'checkbox' | 'radio' | 'select'
  | 'signature' | 'file'

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  plan: PlanType
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  submission_count: number
  submission_limit: number
  form_count: number
  form_limit: number
  created_at: string
  updated_at: string
}

export interface Form {
  id: string
  user_id: string
  title: string
  description: string | null
  original_pdf_url: string | null
  status: FormStatus
  is_published: boolean
  public_slug: string
  form_type: FormType
  branding_color: string
  logo_url: string | null
  redirect_url: string | null
  notification_email: string | null
  submission_count: number
  created_at: string
  updated_at: string
  form_fields?: FormField[]   // joined when needed
}

export interface FormField {
  id: string
  form_id: string
  label: string
  field_type: FieldType
  placeholder: string | null
  required: boolean
  options: string[] | null
  position: number
  page: number
  page_x: number | null
  page_y: number | null
  created_at: string
}

export interface Submission {
  id: string
  form_id: string
  respondent_email: string | null
  data: Record<string, string | boolean | string[]>
  pdf_url: string | null
  ip_address: string | null
  submitted_at: string
}

// =============================================
// API RESPONSE TYPES
// =============================================

export interface ApiResponse<T = null> {
  data?: T
  error?: string
  code?: string
}

// =============================================
// AI DETECTION TYPES
// =============================================

export interface DetectedField {
  label: string
  field_type: FieldType
  required: boolean
  options?: string[]
  page?: number
  page_x?: number | null
  page_y?: number | null
}

// =============================================
// PLAN LIMITS
// =============================================

export const PLAN_LIMITS: Record<PlanType, { forms: number; submissions: number; price: number }> = {
  free:         { forms: 3,         submissions: 10,  price: 0   },
  solo:         { forms: 10,        submissions: 100, price: 29  },
  professional: { forms: 50,        submissions: 500, price: 79  },
  team:         { forms: 999999,    submissions: 999999, price: 149 },
}
