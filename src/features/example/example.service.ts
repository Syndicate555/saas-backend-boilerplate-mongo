import { Example, IExample } from './example.model';
import {
  CreateExampleInput,
  UpdateExampleInput,
  ListExamplesQuery,
} from './example.schema';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../../core/types/errors';
import { logger } from '../../core/config/logger';
import { AuditLog } from '../../database/mongodb/models/AuditLog';

/**
 * Example service - Business logic layer
 */
export class ExampleService {
  /**
   * Create a new example
   */
  async create(userId: string, data: CreateExampleInput): Promise<IExample> {
    try {
      // Check if user already has an example with the same name
      const existing = await Example.findOne({
        userId,
        name: data.name,
        deletedAt: null,
      });

      if (existing) {
        throw new ConflictError('An example with this name already exists');
      }

      // Create the example
      const example = await Example.create({
        ...data,
        userId,
      });

      // AUDIT_STATUS: Logging example creation
      await AuditLog.log({
        userId,
        action: 'create',
        resource: 'example',
        resourceId: (example._id as unknown as string).toString(),
        metadata: { name: data.name },
      });

      logger.info('Example created', {
        userId,
        exampleId: example._id,
        name: data.name,
      });

      return example;
    } catch (error) {
      logger.error('Failed to create example', { error, userId, data });
      throw error;
    }
  }

  /**
   * Get an example by ID
   */
  async getById(
    id: string,
    userId?: string,
    incrementView: boolean = false
  ): Promise<IExample> {
    const example = await Example.findById(id);

    if (!example) {
      throw new NotFoundError('Example not found');
    }

    // Check access permissions
    if (!example.isPublic && example.userId !== userId) {
      throw new ForbiddenError('You do not have access to this example');
    }

    // Increment view count if requested and not the owner
    if (incrementView && example.userId !== userId) {
      // Call static method incrementViewCount
      await Example.incrementViewCount(id);
    }

    return example;
  }

  /**
   * List examples with filtering and pagination
   */
  async list(
    query: ListExamplesQuery,
    currentUserId?: string
  ): Promise<{
    data: IExample[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page,
      limit,
      status,
      isPublic,
      tags,
      search,
      sortBy,
      order,
      userId,
    } = query;

    const skip = (page - 1) * limit;
    const filter: any = {
      deletedAt: null, // Explicitly exclude soft-deleted documents for countDocuments()
    };

    // Build filter
    if (status) filter.status = status;
    if (isPublic !== undefined) filter.isPublic = isPublic;
    if (userId) filter.userId = userId;
    if (tags && tags.length > 0) filter.tags = { $in: tags };

    // If not filtering by user, only show public examples or user's own
    if (!userId && !isPublic) {
      filter.$or = [
        { isPublic: true },
        ...(currentUserId ? [{ userId: currentUserId }] : []),
      ];
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = order === 'asc' ? 1 : -1;

    // Handle search
    let examples;
    let total;

    if (search) {
      // Use text search
      const searchFilter = {
        ...filter,
        $text: { $search: search },
      };

      [examples, total] = await Promise.all([
        Example.find(searchFilter)
          .sort({ score: { $meta: 'textScore' }, ...sort })
          .limit(limit)
          .skip(skip),
        Example.countDocuments(searchFilter),
      ]);
    } else {
      [examples, total] = await Promise.all([
        Example.find(filter)
          .sort(sort)
          .limit(limit)
          .skip(skip),
        Example.countDocuments(filter),
      ]);
    }

    return {
      data: examples,
      total,
      page,
      limit,
    };
  }

  /**
   * Update an example
   */
  async update(
    id: string,
    userId: string,
    data: UpdateExampleInput
  ): Promise<IExample> {
    const example = await Example.findById(id);

    if (!example) {
      throw new NotFoundError('Example not found');
    }

    // Check ownership - call instance method
    if (!example.canEdit(userId)) {
      throw new ForbiddenError('You can only edit your own examples');
    }

    // Check for name conflict if name is being updated
    if (data.name && data.name !== example.name) {
      const existing = await Example.findOne({
        userId,
        name: data.name,
        _id: { $ne: id },
        deletedAt: null,
      });

      if (existing) {
        throw new ConflictError('An example with this name already exists');
      }
    }

    // Track changes for audit log
    const changes: {
      before: Record<string, any>;
      after: Record<string, any>;
    } = {
      before: {},
      after: {},
    };

    // Update fields with proper typing
    Object.keys(data).forEach((key) => {
      const typedKey = key as keyof UpdateExampleInput;
      const currentValue = (example as any)[key];
      const newValue = data[typedKey];

      if (currentValue !== newValue) {
        changes.before[key] = currentValue;
        changes.after[key] = newValue;
        (example as any)[key] = newValue;
      }
    });

    await example.save();

    // AUDIT_STATUS: Logging example update
    await AuditLog.log({
      userId,
      action: 'update',
      resource: 'example',
      resourceId: id,
      changes,
    });

    logger.info('Example updated', { userId, exampleId: id, changes });

    return example;
  }

  /**
   * Delete an example (soft delete)
   */
  async delete(id: string, userId: string): Promise<void> {
    const example = await Example.findById(id);

    if (!example) {
      throw new NotFoundError('Example not found');
    }

    // Check ownership
    if (!example.canEdit(userId)) {
      throw new ForbiddenError('You can only delete your own examples');
    }

    await example.softDelete();

    // AUDIT_STATUS: Logging example deletion
    await AuditLog.log({
      userId,
      action: 'delete',
      resource: 'example',
      resourceId: id,
    });

    logger.info('Example deleted', { userId, exampleId: id });
  }

  /**
   * Publish an example
   */
  async publish(
    id: string,
    userId: string,
    makePublic: boolean = true
  ): Promise<IExample> {
    const example = await Example.findById(id);

    if (!example) {
      throw new NotFoundError('Example not found');
    }

    // Check ownership
    if (!example.canEdit(userId)) {
      throw new ForbiddenError('You can only publish your own examples');
    }

    example.status = 'published';
    example.publishedAt = new Date();
    example.isPublic = makePublic;
    await example.save();

    // AUDIT_STATUS: Logging example publication
    await AuditLog.log({
      userId,
      action: 'publish',
      resource: 'example',
      resourceId: id,
      metadata: { makePublic },
    });

    logger.info('Example published', { userId, exampleId: id, makePublic });

    return example;
  }

  /**
   * Archive an example
   */
  async archive(id: string, userId: string): Promise<IExample> {
    const example = await Example.findById(id);

    if (!example) {
      throw new NotFoundError('Example not found');
    }

    // Check ownership
    if (!example.canEdit(userId)) {
      throw new ForbiddenError('You can only archive your own examples');
    }

    await example.archive();

    // AUDIT_STATUS: Logging example archival
    await AuditLog.log({
      userId,
      action: 'archive',
      resource: 'example',
      resourceId: id,
    });

    logger.info('Example archived', { userId, exampleId: id });

    return example;
  }

  /**
   * Bulk delete examples
   */
  async bulkDelete(
    ids: string[],
    userId: string
  ): Promise<{
    deleted: number;
    failed: string[];
  }> {
    const failed: string[] = [];
    let deleted = 0;

    for (const id of ids) {
      try {
        await this.delete(id, userId);
        deleted++;
      } catch (error) {
        logger.error('Failed to delete example in bulk operation', {
          error,
          exampleId: id,
          userId,
        });
        failed.push(id);
      }
    }

    return { deleted, failed };
  }

  /**
   * Get user's statistics
   */
  async getUserStats(userId: string): Promise<any> {
    const [total, published, drafts, archived, totalViews, popularExample] =
      await Promise.all([
        Example.countDocuments({ userId, deletedAt: null }),
        Example.countDocuments({
          userId,
          status: 'published',
          deletedAt: null,
        }),
        Example.countDocuments({ userId, status: 'draft', deletedAt: null }),
        Example.countDocuments({ userId, status: 'archived', deletedAt: null }),
        Example.aggregate([
          { $match: { userId, deletedAt: null } },
          { $group: { _id: null, totalViews: { $sum: '$viewCount' } } },
        ]),
        Example.findOne({ userId, deletedAt: null })
          .sort({ viewCount: -1 })
          .limit(1),
      ]);

    return {
      total,
      byStatus: {
        published,
        draft: drafts,
        archived,
      },
      totalViews: totalViews[0]?.totalViews || 0,
      mostPopular: popularExample
        ? {
            id: popularExample._id,
            name: popularExample.name,
            views: popularExample.viewCount,
          }
        : null,
    };
  }

  /**
   * Get popular examples
   */
  async getPopular(limit: number = 10): Promise<IExample[]> {
    return Example.getPopular(limit);
  }
}

// Export singleton instance
export const exampleService = new ExampleService();
