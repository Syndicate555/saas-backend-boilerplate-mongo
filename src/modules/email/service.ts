import sgMail from '@sendgrid/mail';
import { env } from '../../core/config/env';

sgMail.setApiKey(env.SENDGRID_API_KEY || '');

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail({ to, subject, html, text }: EmailPayload) {
  await sgMail.send({
    to,
    from: 'noreply@yourdomain.com',
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
