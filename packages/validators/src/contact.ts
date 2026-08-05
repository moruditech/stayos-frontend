import { z } from 'zod';

// POST /public/contact — schema specified in Document 09 §6.
// The endpoint and ContactInquiry backend model do not yet exist — this schema
// is ready but the api-client call for it is stubbed/feature-flagged off until
// the backend route is built.
export const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  subject: z.enum(['sales', 'support', 'partnership', 'other']),
  message: z
    .string()
    .min(10, 'Please provide a bit more detail')
    .max(2000),
});
export type ContactInput = z.infer<typeof contactSchema>;
