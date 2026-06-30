import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email(),
  name: z.string().max(100).optional(),
  password: z
    .string()
    .min(8)
    .max(72)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'password must contain at least one lowercase letter, one uppercase letter, and one digit',
    ),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
