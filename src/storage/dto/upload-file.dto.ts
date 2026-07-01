import { z } from 'zod';
import { DEFAULT_STORAGE_FOLDER, SAFE_FOLDER_PATTERN } from '../storage.constants';

export const UploadFileSchema = z.object({
  folder: z
    .string()
    .trim()
    .regex(
      SAFE_FOLDER_PATTERN,
      'folder may only contain letters, numbers, hyphens, and underscores (max 64 chars)',
    )
    .optional()
    .default(DEFAULT_STORAGE_FOLDER),
});

export type UploadFileDto = z.infer<typeof UploadFileSchema>;
