import Stripe from 'stripe';
import { env } from '../../core/config/env';
import { User } from '../../database/mongodb/models/User';

// FIX: Updated Stripe API version to match installed SDK version
const stripe = new Stripe(env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export async function createCheckoutSession(userId: string, priceId: string) {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
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
