import { z } from 'zod';

// POST /public/contact — implemented in stayos-api-main
// src/modules/mailbox (mailbox.validation.js contactSchema mirrors this).
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
