# Auth Module

Clerk authentication integration for the SaaS backend boilerplate.

## Features

- JWT token verification
- User synchronization with local database
- Webhook handling for user events
- Role-based access control (RBAC)
- Permission-based authorization

## Setup

1. **Create a Clerk account**: https://clerk.dev

2. **Get your API keys**:
   - Go to Clerk Dashboard → API Keys
   - Copy the Secret Key and Webhook Secret

3. **Configure environment variables**:
```env
CLERK_SECRET_KEY=sk_test_your_secret_key
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret
```

4. **Setup webhook endpoint**:
   - In Clerk Dashboard → Webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/clerk`
   - Select events: user.created, user.updated, user.deleted

## Usage

### Protecting Routes

```typescript
import { requireAuth, requireRole, requirePermission } from '@/modules/auth/middleware';

// Require authentication
router.get('/protected', requireAuth, handler);

// Require specific role
router.post('/admin', requireAuth, requireRole('admin'), handler);

// Require specific permission
router.delete('/content/:id', requireAuth, requirePermission('content:delete'), handler);

// Optional authentication (for public routes with enhanced features for logged-in users)
router.get('/public', optionalAuth, handler);
```

### Accessing User Information

```typescript
// In route handlers after requireAuth
app.get('/profile', requireAuth, (req, res) => {
  const user = req.user; // { id, email, role, clerkId }
  res.json({ user });
});
```

### Checking Ownership

```typescript
import { requireOwnership } from '@/modules/auth/middleware';

// Ensure user owns the resource
router.put('/posts/:id', 
  requireAuth, 
  requireOwnership('body.userId'), // Path to user ID in request
  handler
);
```

## Roles and Permissions

### Default Roles

- **admin**: Full access to all resources
- **moderator**: Can moderate content, manage users
- **user**: Standard user permissions

### Permission Format

Permissions follow the format: `resource:action:scope`

Examples:
- `users:read` - Read any user
- `users:read:own` - Read own user data
- `content:delete:own` - Delete own content
- `*` - All permissions (admin only)

### Customizing Permissions

Edit the permission mappings in `middleware.ts`:

```typescript
const rolePermissions: Record<string, string[]> = {
  admin: ['*'],
  moderator: [
    'users:read',
    'content:moderate',
    // Add more permissions
  ],
  user: [
    'users:read:own',
    'users:update:own',
    // Add more permissions
  ],
};
```

## Webhook Events

The module handles these Clerk webhook events:

- **user.created**: Creates user in local database
- **user.updated**: Updates user information
- **user.deleted**: Soft deletes user
- **email.created**: Updates user email if primary
- **session.created**: Updates last login timestamp

## Testing

Mock Clerk in your tests:

```typescript
jest.mock('@clerk/clerk-sdk-node', () => ({
  clerkClient: {
    verifyToken: jest.fn().mockResolvedValue({ sub: 'user_123' }),
    users: {
      getUser: jest.fn().mockResolvedValue({
        id: 'user_123',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      }),
    },
  },
}));
```

## Security Considerations

1. **Always verify webhooks**: The module automatically verifies Clerk webhook signatures
2. **Token expiration**: Clerk handles token expiration automatically
3. **Rate limiting**: Apply rate limiters to authentication endpoints
4. **Audit logging**: All authentication events are logged

## Troubleshooting

### Common Issues

1. **"Invalid token"**: Check that CLERK_SECRET_KEY is correct
2. **"User not found"**: Ensure webhook events are being received
3. **"Webhook verification failed"**: Verify CLERK_WEBHOOK_SECRET matches Dashboard

### Debug Mode

Enable debug logging:
```env
LOG_LEVEL=debug
```

## API Reference

### Middleware Functions

- `requireAuth`: Requires valid authentication token
- `optionalAuth`: Attempts authentication but doesn't fail
- `requireRole(...roles)`: Requires user to have one of specified roles
- `requirePermission(...permissions)`: Requires user to have permissions
- `requireOwnership(path)`: Ensures user owns the resource

### Helper Functions

- `verifyClerkToken(token)`: Manually verify a Clerk token
- `getUserIdFromToken(token)`: Extract user ID without full auth
- `refreshUserData(clerkId)`: Sync user data from Clerk
