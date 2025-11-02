import { emailQueue } from '../queue';

export async function enqueueExampleEmail(email: string) {
  await emailQueue.add('welcome-email', { to: email, subject: 'Welcome!', html: '<p>Hello!</p>', text: 'Hello!' });
}
