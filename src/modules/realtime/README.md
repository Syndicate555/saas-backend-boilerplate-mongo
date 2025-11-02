# Realtime Module

This module integrates [Socket.IO](https://socket.io) to provide real-time capabilities such as live updates or chat. Authentication is enforced using Clerk JWT tokens.

## Setup

1. Initialize Socket.IO by passing your HTTP server into `setupSocketIO` in `src/index.ts`:

```ts
import http from 'http';
import { createServer } from './core/server';
import { setupSocketIO } from './modules/realtime/server';

const app = createServer();
const server = http.createServer(app);
setupSocketIO(server);
server.listen(env.PORT);
```

2. On the client side, pass the Clerk JWT token when connecting:

```js
const socket = io(BASE_URL, { auth: { token: '<clerk_jwt>' } });
```

## Emitting Events

Two helper functions are provided:

- `emitToRoom(room, event, data)`: Send an event to all clients in a given room.
- `emitToUser(userId, event, data)`: Send an event to a specific user (clients join a `user-<id>` room on connection).

Use these helpers from anywhere in your application to push real-time updates.
