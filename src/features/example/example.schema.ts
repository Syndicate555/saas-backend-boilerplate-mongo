import { z } from 'zod';
import { commonSchemas } from '../../core/middleware/validate';

/**
 * Status enum
 */
export const ExampleStatus = z.enum(['draft', 'published', 'archived']);

/**
 * Create example schema
 */
export const createExampleSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .trim()
    .optional(),
  status: ExampleStatus.default('draft'),
  tags: z
    .array(z.string().trim().toLowerCase())
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
  isPublic: z.boolean().default(false),
  metadata: z.record(z.any()).optional(),
});

/**
 * Update example schema (partial)
 */
export const updateExampleSchema = createExampleSchema.partial();

/**
 * Query params schema for listing examples
 */
export const listExamplesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: ExampleStatus.optional(),
  isPublic: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  tags: z
    .string()
    .transform((val) => val.split(',').map((tag) => tag.trim().toLowerCase()))
    .optional(),
  search: z.string().min(1).optional(),
  sortBy: z
    .enum(['name', 'createdAt', 'updatedAt', 'viewCount'])
    .default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  userId: commonSchemas.objectId.optional(),
});

/**
 * ID param schema
 */
export const idParamSchema = z.object({
  id: commonSchemas.objectId,
});

/**
 * Publish example schema
 */
export const publishExampleSchema = z.object({
  makePublic: z.boolean().default(true),
});

/**
 * Bulk delete schema
 */
export const bulkDeleteSchema = z.object({
  ids: z.array(commonSchemas.objectId).min(1).max(100),
});

/**
 * Type exports
 */
export type CreateExampleInput = z.infer<typeof createExampleSchema>;
export type UpdateExampleInput = z.infer<typeof updateExampleSchema>;
export type ListExamplesQuery = z.infer<typeof listExamplesQuerySchema>;
export type PublishExampleInput = z.infer<typeof publishExampleSchema>;
export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;
