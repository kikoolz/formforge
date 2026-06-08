// app/(auth)/signup/page.tsx
import { redirect } from 'next/navigation'

export default function SignupPage() {
  redirect('/login')
}