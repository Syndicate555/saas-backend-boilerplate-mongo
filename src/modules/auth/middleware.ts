import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { AuthError, ForbiddenError } from '../../core/types/errors';
import { logger } from '../../core/config/logger';
import { User } from '../../database/mongodb/models/User';
import { UserRepository } from '../../database/supabase/client';
import { env, features } from '../../core/config/env';

/**
 * Verify Clerk JWT token
 */
export async function verifyClerkToken(token: string): Promise<any> {
  try {
    const decoded = await clerkClient.verifyToken(token);
    return decoded;
  } catch (error) {
    logger.error('Failed to verify Clerk token', { error });
    throw new AuthError('Invalid authentication token');
  }
}

/**
 * Extract token from request
 * AUDIT: Changed return type to string | null and handle undefined authHeader explicitly
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader || authHeader === undefined) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] || null;
}

/**
 * Require authentication middleware
 * AUDIT: Prefixed unused res parameter with underscore
 * AUDIT: Added mock authentication for development when Clerk is not configured
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  // Handle missing Clerk credentials gracefully
  if (!features.auth) {
    if (env.NODE_ENV === 'development') {
      // Mock user for development
      req.user = {
        id: 'dev-user-id',
        email: 'dev@example.com',
        role: 'admin',
        clerkId: 'dev-clerk-id',
        metadata: {},
      };
      return next();
    } else {
      return next(new AuthError('Authentication not configured'));
    }
  }

  try {
    const token = extractToken(req);
    
    if (!token) {
      throw new AuthError('No authentication token provided');
    }

    // Verify token with Clerk
    const session = await verifyClerkToken(token);
    
    if (!session || !session.sub) {
      throw new AuthError('Invalid authentication token');
    }

    // Get user from Clerk
    const clerkUser = await clerkClient.users.getUser(session.sub);
    
    if (!clerkUser) {
      throw new AuthError('User not found');
    }

    // Load or create user in our database
    let user;
    
    if (env.DATABASE_TYPE === 'mongodb') {
      // MongoDB implementation
      const UserModel = User as any;
      user = await UserModel.findByClerkId(session.sub);
      
      if (!user) {
        // Auto-create user if doesn't exist
        user = await UserModel.create({
          clerkId: session.sub,
          email: clerkUser.emailAddresses[0]?.emailAddress,
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || undefined,
          emailVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
          profileImage: clerkUser.imageUrl,
          lastLoginAt: new Date(),
        });
      } else {
        // Update last login
        await user.updateLastLogin();
      }
    } else {
      // Supabase implementation
      try {
        user = await UserRepository.findByClerkId(session.sub);
      } catch {
        // User doesn't exist, create it
        user = await UserRepository.create({
          clerk_id: session.sub,
          email: clerkUser.emailAddresses[0]?.emailAddress.toLowerCase(),
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null,
          email_verified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
          profile_image: clerkUser.imageUrl,
          last_login_at: new Date().toISOString(),
        });
      }
    }

    // Attach user to request
    req.user = {
      id: env.DATABASE_TYPE === 'mongodb' ? user._id.toString() : user.id,
      email: user.email,
      role: user.role,
      clerkId: session.sub,
      metadata: user.metadata,
    };

    next();
  } catch (error) {
    if (error instanceof AuthError) {
      next(error);
    } else {
      logger.error('Authentication error', { error });
      next(new AuthError('Authentication failed'));
    }
  }
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 * AUDIT: Prefixed unused res parameter with underscore
 * AUDIT: Added mock authentication for development when Clerk is not configured
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  // Handle missing Clerk credentials gracefully
  if (!features.auth) {
    if (env.NODE_ENV === 'development') {
      // Mock user for development
      req.user = {
        id: 'dev-user-id',
        email: 'dev@example.com',
        role: 'admin',
        clerkId: 'dev-clerk-id',
        metadata: {},
      };
      return next();
    } else {
      return next(new AuthError('Authentication not configured'));
    }
  }

  try {
    const token = extractToken(req);

    if (!token) {
      return next();
    }

    // Try to authenticate but don't fail if it doesn't work
    await requireAuth(req, _res, next);
  } catch {
    // Continue without authentication
    next();
  }
}

/**
 * Require specific role(s)
 * AUDIT: Prefixed unused res parameter with underscore
 * AUDIT: Added mock authentication for development when Clerk is not configured
 */
export function requireRole(...roles: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Handle missing Clerk credentials gracefully
    if (!features.auth) {
      if (env.NODE_ENV === 'development') {
        // Mock user for development
        req.user = {
          id: 'dev-user-id',
          email: 'dev@example.com',
          role: 'admin',
          clerkId: 'dev-clerk-id',
          metadata: {},
        };
        return next();
      } else {
        return next(new AuthError('Authentication not configured'));
      }
    }

    try {
      // Ensure user is authenticated
      if (!req.user) {
        throw new AuthError('Authentication required');
      }

      // Check if user has one of the required roles
      if (!roles.includes(req.user.role)) {
        throw new ForbiddenError(
          `Access denied. Required role(s): ${roles.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require specific permission(s)
 * AUDIT: Prefixed unused res parameter with underscore
 * AUDIT: Added mock authentication for development when Clerk is not configured
 */
export function requirePermission(...permissions: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Handle missing Clerk credentials gracefully
    if (!features.auth) {
      if (env.NODE_ENV === 'development') {
        // Mock user for development
        req.user = {
          id: 'dev-user-id',
          email: 'dev@example.com',
          role: 'admin',
          clerkId: 'dev-clerk-id',
          metadata: {},
        };
        return next();
      } else {
        return next(new AuthError('Authentication not configured'));
      }
    }

    try {
      // Ensure user is authenticated
      if (!req.user) {
        throw new AuthError('Authentication required');
      }

      // Admin bypasses all permission checks
      if (req.user.role === 'admin') {
        return next();
      }

      // Check permissions based on role
      const hasPermission = permissions.some(permission => {
        return checkRolePermission(req.user!.role, permission);
      });

      if (!hasPermission) {
        throw new ForbiddenError(
          `Access denied. Required permission(s): ${permissions.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if a role has a specific permission
 */
function checkRolePermission(role: string, permission: string): boolean {
  // Define role-permission mappings
  const rolePermissions: Record<string, string[]> = {
    admin: ['*'], // Admin has all permissions
    moderator: [
      'users:read',
      'users:update:own',
      'content:read',
      'content:create',
      'content:update:own',
      'content:delete:own',
      'content:moderate',
    ],
    user: [
      'users:read:own',
      'users:update:own',
      'content:read',
      'content:create',
      'content:update:own',
      'content:delete:own',
    ],
  };

  const permissions = rolePermissions[role] || [];
  
  // Check for wildcard permission
  if (permissions.includes('*')) {
    return true;
  }

  // Check for exact permission match
  if (permissions.includes(permission)) {
    return true;
  }

  // Check for partial wildcard matches (e.g., 'users:*')
  const permissionParts = permission.split(':');
  for (let i = permissionParts.length; i > 0; i--) {
    const wildcardPermission = permissionParts.slice(0, i - 1).concat('*').join(':');
    if (permissions.includes(wildcardPermission)) {
      return true;
    }
  }

  return false;
}

/**
 * Middleware to check resource ownership
 * AUDIT: Prefixed unused res parameter with underscore
 * AUDIT: Added mock authentication for development when Clerk is not configured
 */
export function requireOwnership(
  resourceUserIdPath: string = 'userId'
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Handle missing Clerk credentials gracefully
    if (!features.auth) {
      if (env.NODE_ENV === 'development') {
        // Mock user for development
        req.user = {
          id: 'dev-user-id',
          email: 'dev@example.com',
          role: 'admin',
          clerkId: 'dev-clerk-id',
          metadata: {},
        };
        return next();
      } else {
        return next(new AuthError('Authentication not configured'));
      }
    }

    try {
      if (!req.user) {
        throw new AuthError('Authentication required');
      }

      // Admin can access everything
      if (req.user.role === 'admin') {
        return next();
      }

      // Get resource user ID from the specified path
      const pathParts = resourceUserIdPath.split('.');
      let resourceUserId: any = req;

      for (const part of pathParts) {
        resourceUserId = resourceUserId[part];
        if (resourceUserId === undefined) {
          break;
        }
      }

      // Check ownership
      if (resourceUserId !== req.user.id) {
        throw new ForbiddenError('You can only access your own resources');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Extract user ID from token without full authentication
 */
export async function getUserIdFromToken(token: string): Promise<string | null> {
  try {
    const session = await verifyClerkToken(token);
    return session?.sub || null;
  } catch {
    return null;
  }
}

/**
 * Refresh user data from Clerk
 */
export async function refreshUserData(clerkId: string): Promise<void> {
  try {
    const clerkUser = await clerkClient.users.getUser(clerkId);
    
    if (!clerkUser) {
      logger.warn(`Clerk user not found: ${clerkId}`);
      return;
    }

    if (env.DATABASE_TYPE === 'mongodb') {
      const UserModel = User as any;
      const user = await UserModel.findByClerkId(clerkId);
      
      if (user) {
        user.email = clerkUser.emailAddresses[0]?.emailAddress;
        user.name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || undefined;
        user.emailVerified = clerkUser.emailAddresses[0]?.verification?.status === 'verified';
        user.profileImage = clerkUser.imageUrl;
        await user.save();
      }
    } else {
      await UserRepository.update(clerkId, {
        email: clerkUser.emailAddresses[0]?.emailAddress.toLowerCase(),
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null,
        email_verified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
        profile_image: clerkUser.imageUrl,
      });
    }
    
    logger.info(`User data refreshed for ${clerkId}`);
  } catch (error) {
    logger.error(`Failed to refresh user data for ${clerkId}`, { error });
  }
}
