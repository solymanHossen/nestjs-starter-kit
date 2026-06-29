import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'password is required'),
});

export type LoginDto = z.infer<typeof LoginSchema>;
