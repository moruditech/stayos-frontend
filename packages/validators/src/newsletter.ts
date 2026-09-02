import { z } from 'zod';

// POST /public/newsletter/subscribe — footer form. Must match
// stayos-api-main/src/modules/newsletter/newsletter.validation.js subscribeSchema.
export const newsletterSubscribeSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(254),
});
export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeSchema>;
