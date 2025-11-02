# Payments Module

This module wraps the [Stripe](https://stripe.com) SDK to support subscription payments. It includes helper functions to create checkout and billing portal sessions, a webhook handler for processing Stripe events, and an Express router exposing endpoints for clients to initiate checkouts and manage billing.

## Setup

1. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in your environment variables.
2. Ensure users have a `stripeCustomerId` property in your database to link Stripe customers with local records. When a checkout session completes, the webhook handler will update this field.
3. Mount the routes in your main router:

```ts
import paymentRoutes from './modules/payments/routes';
app.use('/api/payments', paymentRoutes);
```

## Endpoints

| Method | Path             | Description                             |
| ------ | ---------------- | --------------------------------------- |
| POST   | `/checkout`      | Create a new checkout session (requires authentication) |
| POST   | `/portal`        | Create a billing portal session (requires authentication) |
| POST   | `/webhook`       | Receive Stripe webhook events           |

### Example Checkout

```
curl -X POST /api/payments/checkout \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"priceId":"price_123"}'
```
