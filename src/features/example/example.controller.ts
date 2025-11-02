import { Request, Response } from 'express';
import { exampleService } from './example.service';
import { success, paginated, deleted } from '../../core/utils/apiResponse';
import { asyncHandler } from '../../core/middleware/asyncHandler';

/**
 * Example controller - HTTP request handlers
 */
export class ExampleController {
  /**
   * Create a new example
   * POST /api/examples
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const example = await exampleService.create(req.user!.id, req.body);
    
    res.status(201).json(
      success(example, {
        message: 'Example created successfully',
      })
    );
  });

  /**
   * Get an example by ID
   * GET /api/examples/:id
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    // Use bracket notation for index signature access
    const incrementView = req.query['view'] === 'true';

    const example = await exampleService.getById(
      id as string,
      req.user?.id,
      incrementView
    );

    res.json(success(example));
  });

  /**
   * List examples with filtering and pagination
   * GET /api/examples
   */
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await exampleService.list(
      req.query as any,
      req.user?.id
    );
    
    res.json(
      paginated(result.data, result.total, result.page, result.limit)
    );
  });

  /**
   * Update an example
   * PUT /api/examples/:id
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    // AUDIT_STATUS: Authenticated user updating their own example
    const userId = req.user!.id as string;

    const example = await exampleService.update(
      id as string,
      userId,
      req.body
    );

    res.json(
      success(example, {
        message: 'Example updated successfully',
      })
    );
  });

  /**
   * Delete an example
   * DELETE /api/examples/:id
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    // AUDIT_STATUS: Authenticated user deleting their own example
    const userId = req.user!.id as string;

    await exampleService.delete(id as string, userId);

    res.json(deleted('Example deleted successfully'));
  });

  /**
   * Publish an example
   * POST /api/examples/:id/publish
   */
  publish = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { makePublic } = req.body;
    // AUDIT_STATUS: Authenticated user publishing their own example
    const userId = req.user!.id as string;

    const example = await exampleService.publish(
      id as string,
      userId,
      makePublic
    );

    res.json(
      success(example, {
        message: 'Example published successfully',
      })
    );
  });

  /**
   * Archive an example
   * POST /api/examples/:id/archive
   */
  archive = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    // AUDIT_STATUS: Authenticated user archiving their own example
    const userId = req.user!.id as string;

    const example = await exampleService.archive(id as string, userId);

    res.json(
      success(example, {
        message: 'Example archived successfully',
      })
    );
  });

  /**
   * Bulk delete examples
   * POST /api/examples/bulk-delete
   */
  bulkDelete = asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body;
    
    const result = await exampleService.bulkDelete(ids, req.user!.id);
    
    res.json(
      success(result, {
        message: `${result.deleted} examples deleted successfully`,
      })
    );
  });

  /**
   * Get user statistics
   * GET /api/examples/stats
   */
  getUserStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await exampleService.getUserStats(req.user!.id);
    
    res.json(success(stats));
  });

  /**
   * Get popular examples
   * GET /api/examples/popular
   */
  getPopular = asyncHandler(async (req: Request, res: Response) => {
    // Use bracket notation for index signature access
    const limit = parseInt(req.query['limit'] as string) || 10;

    const examples = await exampleService.getPopular(limit);

    res.json(success(examples));
  });

  /**
   * Get my examples
   * GET /api/examples/mine
   */
  getMine = asyncHandler(async (req: Request, res: Response) => {
    const query = {
      ...req.query,
      userId: req.user!.id,
    };
    
    const result = await exampleService.list(query as any, req.user!.id);
    
    res.json(
      paginated(result.data, result.total, result.page, result.limit)
    );
  });
}

// Export singleton instance
export const exampleController = new ExampleController();
