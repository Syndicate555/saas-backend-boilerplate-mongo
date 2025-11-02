# Email Module

This module integrates [SendGrid](https://sendgrid.com/) for sending transactional emails. It exposes helper functions for sending arbitrary emails and a convenient `sendWelcomeEmail` function for new users.

## Setup

1. Set `SENDGRID_API_KEY` in your environment variables.
2. Optionally customize the `from` address in `service.ts`.

### Sending Emails

Import and call `sendEmail` with the required fields:

```ts
import { sendEmail } from './modules/email/service';

await sendEmail({
  to: 'user@example.com',
  subject: 'Hello!',
  html: '<p>Hello world</p>',
  text: 'Hello world',
});
```

### Welcome Emails

Use `sendWelcomeEmail` to deliver a standardized welcome message to newly registered users. This function renders a simple HTML template and sends both HTML and plain text versions.
