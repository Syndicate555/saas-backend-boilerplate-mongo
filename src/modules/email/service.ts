import sgMail from '@sendgrid/mail';
import { env, features } from '../../core/config/env';
import { logger } from '../../core/config/logger';

// Only initialize SendGrid if configured
if (features.sendgrid && env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
  logger.info('SendGrid initialized');
}

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail({ to, subject, html, text }: EmailPayload) {
  if (!features.sendgrid) {
    logger.warn('SendGrid not configured, skipping email send', {
      to,
      subject,
    });
    return;
  }

  await sgMail.send({
    to,
    from: env.SENDGRID_FROM_EMAIL!,
    subject,
    html,
    text,
  });
}

export async function sendWelcomeEmail(user: { name?: string; email: string }) {
  // FIX: Use bracket notation for 'name' property access
  const name = user['name'] || 'there';
  const html = renderTemplate('welcome', { name });
  const text = stripHtml(html);
  await sendEmail({
    to: user.email,
    subject: 'Welcome!',
    html,
    text,
  });
}

// Render a simple HTML template. In a real app, you might use a templating
// engine such as Handlebars or EJS and load files from disk.
function renderTemplate(template: string, vars: Record<string, string>) {
  if (template === 'welcome') {
    // FIX: Use bracket notation for 'name' property access from index signature
    return `<!DOCTYPE html><html><body><h1>Welcome, ${vars['name']}!</h1><p>Thanks for joining us.</p></body></html>`;
  }
  return '';
}

// Very naive HTML stripping for plain text fallback
function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '');
}
