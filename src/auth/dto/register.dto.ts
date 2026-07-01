import { z } from 'zod';

export const RegisterSchema = z
  .object({
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
  })
  // Reject unrecognized fields (e.g. a client-supplied `role`) instead of the
  // Zod object default of silently stripping them — matches the whitelist +
  // forbidNonWhitelisted contract StrictValidationPipe applies to class-based DTOs.
  .strict();

export type RegisterDto = z.infer<typeof RegisterSchema>;
