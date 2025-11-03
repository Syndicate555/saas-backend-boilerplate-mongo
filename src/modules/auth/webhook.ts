import { Request, Response } from 'express';
import { Webhook } from 'svix';
import { env } from '../../core/config/env';
import { logger } from '../../core/config/logger';
import { User } from '../../database/mongodb/models/User';
import { asyncHandler } from '../../core/middleware/asyncHandler';

/**
 * Clerk webhook event types
 */
interface ClerkWebhookEvent {
  data: any;
  object: string;
  type: string;
}

/**
 * Verify Clerk webhook signature
 */
function verifyWebhookSignature(req: Request): ClerkWebhookEvent {
  const webhookSecret = env.CLERK_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('Clerk webhook secret not configured');
  }

  const svixId = req.headers['svix-id'] as string;
  const svixTimestamp = req.headers['svix-timestamp'] as string;
  const svixSignature = req.headers['svix-signature'] as string;

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new Error('Missing svix headers');
  }

  const body = req.body;
  const wh = new Webhook(webhookSecret);

  try {
    return wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch (error) {
    logger.error('Webhook verification failed', { error });
    throw new Error('Invalid webhook signature');
  }
}

/**
 * Handle Clerk webhook events
 */
export const handleClerkWebhook = asyncHandler(async (req: Request, res: Response) => {
  try {
    const event = verifyWebhookSignature(req);

    logger.info('Clerk webhook received', {
      type: event.type,
      id: event.data.id,
    });

    // Handle different event types
    switch (event.type) {
      case 'user.created':
        await handleUserCreated(event.data);
        break;

      case 'user.updated':
        await handleUserUpdated(event.data);
        break;

      case 'user.deleted':
        await handleUserDeleted(event.data);
        break;

      case 'email.created':
        await handleEmailCreated(event.data);
        break;

      case 'session.created':
        await handleSessionCreated(event.data);
        break;

      default:
        logger.info(`Unhandled webhook event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook processing error', { error });
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle user.created event
 */
async function handleUserCreated(userData: any): Promise<void> {
  try {
    const userInfo = {
      clerkId: userData.id,
      email: userData.email_addresses[0]?.email_address,
      name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || undefined,
      emailVerified: userData.email_addresses[0]?.verification?.status === 'verified',
      profileImage: userData.image_url,
    };

    const UserModel = User as any;

    // Check if user already exists
    const existingUser = await UserModel.findByClerkId(userData.id);

    if (!existingUser) {
      await UserModel.create(userInfo);
      logger.info(`User created in MongoDB: ${userData.id}`);
    } else {
      logger.warn(`User already exists in MongoDB: ${userData.id}`);
    }
  } catch (error) {
    logger.error('Error handling user.created webhook', { error, userData });
    throw error;
  }
}

/**
 * Handle user.updated event
 */
async function handleUserUpdated(userData: any): Promise<void> {
  try {
    const updates = {
      email: userData.email_addresses[0]?.email_address,
      name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || undefined,
      emailVerified: userData.email_addresses[0]?.verification?.status === 'verified',
      profileImage: userData.image_url,
    };

    const UserModel = User as any;
    const user = await UserModel.findByClerkId(userData.id);

    if (user) {
      Object.assign(user, updates);
      await user.save();
      logger.info(`User updated in MongoDB: ${userData.id}`);
    } else {
      // User doesn't exist, create it
      await handleUserCreated(userData);
    }
  } catch (error) {
    logger.error('Error handling user.updated webhook', { error, userData });
    throw error;
  }
}

/**
 * Handle user.deleted event
 */
async function handleUserDeleted(userData: any): Promise<void> {
  try {
    const UserModel = User as any;
    await UserModel.softDelete(userData.id);
    logger.info(`User soft deleted in MongoDB: ${userData.id}`);
  } catch (error) {
    logger.error('Error handling user.deleted webhook', { error, userData });
    throw error;
  }
}

/**
 * Handle email.created event
 */
async function handleEmailCreated(emailData: any): Promise<void> {
  try {
    // Update user's email if primary email changed
    if (emailData.primary) {
      const userId = emailData.user_id;

      const UserModel = User as any;
      const user = await UserModel.findByClerkId(userId);

      if (user) {
        user.email = emailData.email_address;
        user.emailVerified = emailData.verification?.status === 'verified';
        await user.save();
        logger.info(`User email updated in MongoDB: ${userId}`);
      }
    }
  } catch (error) {
    logger.error('Error handling email.created webhook', { error, emailData });
    throw error;
  }
}

/**
 * Handle session.created event (for tracking last login)
 */
async function handleSessionCreated(sessionData: any): Promise<void> {
  try {
    const userId = sessionData.user_id;

    const UserModel = User as any;
    const user = await UserModel.findByClerkId(userId);

    if (user) {
      await user.updateLastLogin();
      logger.debug(`User last login updated in MongoDB: ${userId}`);
    }
  } catch (error) {
    logger.error('Error handling session.created webhook', { error, sessionData });
    // Don't throw - this is not critical
  }
}
