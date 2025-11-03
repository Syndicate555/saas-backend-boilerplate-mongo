import { Request, Response } from 'express';
import Stripe from 'stripe';
import { env } from '../../core/config/env';
import { logger } from '../../core/config/logger';
import { User } from '../../database/mongodb/models/User';

// FIX: Updated Stripe API version to match installed SDK version
const stripe = new Stripe(env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });

// FIX: Added return type to ensure all code paths return a value
export async function handleStripeWebhook(req: Request, res: Response): Promise<Response> {
  const sig = req.headers['stripe-signature'] as string;
  if (!sig || !env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).end();
  }
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', err as Error);
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }
  const data: any = event.data.object;
  const metadata = (data.metadata || {}) as Record<string, string>;
  // FIX: Use bracket notation for 'userId' property access
  const userId = metadata['userId'] || data.metadata?.['userId'];

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        if (userId) {
          const customerId = data.customer as string;
          await updateSubscription(userId, 'pro', customerId);
        }
        break;
      case 'customer.subscription.updated':
        // For this example we ignore status changes
        break;
      case 'customer.subscription.deleted':
        if (data.customer && userId) {
          await updateSubscription(userId, 'free', undefined);
        }
        break;
      case 'invoice.payment_failed':
        // Could trigger an email
        break;
      default:
        logger.info(`Unhandled Stripe event ${event.type}`);
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Error processing Stripe webhook', error as Error);
    return res.status(500).json({ received: false });
  }
}

async function updateSubscription(userId: string, subscription: string, customerId?: string) {
  await User.findByIdAndUpdate(userId, {
    subscription,
    stripeCustomerId: customerId,
  });
}
