import Stripe from 'stripe';
import { env } from '../../core/config/env';
import { User as MongooseUser } from '../../database/mongodb/models/User';
import { getSupabaseClient } from '../../database/supabase/client';

// FIX: Updated Stripe API version to match installed SDK version
const stripe = new Stripe(env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });

export async function createCheckoutSession(userId: string, priceId: string) {
  let user: any;
  if (env.DATABASE_TYPE === 'mongodb') {
    user = await MongooseUser.findById(userId);
  } else {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
    if (error) throw error;
    user = data;
  }
  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.FRONTEND_URL}/pricing`,
    metadata: { userId },
  });
  return session;
}

export async function createPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.FRONTEND_URL}/settings`,
  });
  return session;
}
