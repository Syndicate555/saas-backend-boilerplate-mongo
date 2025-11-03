import { Router } from 'express';
import { requireAuth } from '../auth/middleware';
import { asyncHandler } from '../../core/middleware/asyncHandler';
import { createCheckoutSession, createPortalSession } from './service';
import { success } from '../../core/utils/apiResponse';
import { handleStripeWebhook } from './webhook';

const router = Router();

router.post(
  '/checkout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = await createCheckoutSession(req.user!.id, req.body.priceId);
    res.json(success({ url: session.url }));
  })
);

router.post(
  '/portal',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    // For simplicity, we assume stripeCustomerId exists on user model
    // In production, you'd load the full record
    const session = await createPortalSession(
      (user as any).stripeCustomerId || ''
    );
    res.json(success({ url: session.url }));
  })
);

// Stripe requires raw body for signature verification; in server.ts you'll need to
// configure this route separately to use express.raw()
router.post('/webhook', handleStripeWebhook);

export default router;
