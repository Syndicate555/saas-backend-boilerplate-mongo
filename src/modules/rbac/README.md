# RBAC Module

This module implements simple role-based access control. Permissions are declared in `permissions.ts` as a mapping of permission strings to allowed roles. Middleware functions enforce permissions on routes.

## Usage

Import `requirePermission` and add it to routes after authentication middleware:

```ts
import { requireAuth } from '../modules/auth/middleware';
import { requirePermission } from '../modules/rbac/middleware';

router.post('/events', requireAuth, requirePermission('events.create'), createEventHandler);
```

To change who has access to what, edit `src/modules/rbac/permissions.ts`.
