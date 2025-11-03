import { getEmailQueue } from '../queue';

export async function enqueueExampleEmail(email: string) {
  const emailQueue = getEmailQueue();
  if (emailQueue) {
    await emailQueue.add('welcome-email', { to: email, subject: 'Welcome!', html: '<p>Hello!</p>', text: 'Hello!' });
  }
}
