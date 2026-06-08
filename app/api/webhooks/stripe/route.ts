import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { PLAN_LIMITS } from '@/types'
import type { PlanType } from '@/types'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature error:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const PRICE_TO_PLAN: Record<string, PlanType> = {
    [process.env.STRIPE_SOLO_PRICE_ID!]:         'solo',
    [process.env.STRIPE_PRO_PRICE_ID!]:           'professional',
    [process.env.STRIPE_TEAM_PRICE_ID!]:          'team',
  }

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.supabase_user_id
      const plan = session.metadata?.plan as PlanType

      if (userId && plan) {
        const limits = PLAN_LIMITS[plan]
        await supabaseAdmin.from('users').update({
          plan,
          stripe_subscription_id: session.subscription as string,
          form_limit: limits.forms,
          submission_limit: limits.submissions,
        }).eq('id', userId)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabaseAdmin.from('users')
        .update({
          plan: 'free',
          stripe_subscription_id: null,
          form_limit: PLAN_LIMITS.free.forms,
          submission_limit: PLAN_LIMITS.free.submissions,
        })
        .eq('stripe_subscription_id', sub.id)
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const priceId = sub.items.data[0].price.id
      const plan = PRICE_TO_PLAN[priceId]

      if (plan) {
        const limits = PLAN_LIMITS[plan]
        await supabaseAdmin.from('users')
          .update({ plan, form_limit: limits.forms, submission_limit: limits.submissions })
          .eq('stripe_subscription_id', sub.id)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
