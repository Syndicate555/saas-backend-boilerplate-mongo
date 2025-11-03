import { Router } from 'express';
import { exampleController } from './example.controller';
import { validate } from '../../core/middleware/validate';
import {
  createExampleSchema,
  updateExampleSchema,
  listExamplesQuerySchema,
  idParamSchema,
  publishExampleSchema,
  bulkDeleteSchema,
} from './example.schema';
import {
  requireAuth,
  optionalAuth,
  requireRole,
} from '../../modules/auth/middleware';
import { strictLimiter } from '../../core/middleware/rateLimiter';
import { asyncHandler } from '../../core/middleware/asyncHandler';
import { exampleService } from './example.service';
import { paginated } from '../../core/utils/apiResponse';

const router = Router();

/**
 * Public routes (optional auth for better experience)
 */

// Get popular examples (public)
router.get(
  '/popular',
  optionalAuth,
  validate(listExamplesQuerySchema.pick({ limit: true }), 'query'),
  exampleController.getPopular
);

// Get single example (public if published)
router.get(
  '/:id',
  optionalAuth,
  validate(idParamSchema, 'params'),
  exampleController.getById
);

// List examples (public examples visible to all)
router.get(
  '/',
  optionalAuth,
  validate(listExamplesQuerySchema, 'query'),
  exampleController.list
);

/**
 * Authenticated routes
 */

// Get user's own examples
router.get(
  '/mine',
  requireAuth,
  validate(listExamplesQuerySchema, 'query'),
  exampleController.getMine
);

// Get user statistics
router.get('/stats', requireAuth, exampleController.getUserStats);

// Create new example
router.post(
  '/',
  requireAuth,
  strictLimiter,
  validate(createExampleSchema, 'body'),
  exampleController.create
);

// Update example
router.put(
  '/:id',
  requireAuth,
  validate(idParamSchema, 'params'),
  validate(updateExampleSchema, 'body'),
  exampleController.update
);

// Delete example
router.delete(
  '/:id',
  requireAuth,
  validate(idParamSchema, 'params'),
  exampleController.delete
);

// Publish example
router.post(
  '/:id/publish',
  requireAuth,
  validate(idParamSchema, 'params'),
  validate(publishExampleSchema, 'body'),
  exampleController.publish
);

// Archive example
router.post(
  '/:id/archive',
  requireAuth,
  validate(idParamSchema, 'params'),
  exampleController.archive
);

// Bulk delete examples
router.post(
  '/bulk-delete',
  requireAuth,
  validate(bulkDeleteSchema, 'body'),
  exampleController.bulkDelete
);

/**
 * Admin routes
 */

// Admin can view all examples with additional filters
router.get(
  '/admin/all',
  requireAuth,
  requireRole('admin'),
  validate(listExamplesQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    // Admin can see all examples including deleted ones
    const result = await exampleService.list(
      { ...req.query, includeDeleted: true } as any,
      req.user!.id
    );

    res.json(paginated(result.data, result.total, result.page, result.limit));
  })
);

export default router;
