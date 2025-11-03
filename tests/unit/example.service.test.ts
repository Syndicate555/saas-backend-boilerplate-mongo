/**
 * Unit tests for Example Service
 * Tests business logic layer without HTTP layer
 */

import { exampleService } from '../../src/features/example/example.service';
import { Example } from '../../src/features/example/example.model';
import { setupTestDB } from '../helpers/db.helper';
import {
  createMockExample,
  createMockExamples,
  MOCK_USER_ID,
  MOCK_USER_ID_2,
} from '../helpers/mock.helper';
import { NotFoundError, ForbiddenError, ConflictError } from '../../src/core/types/errors';

// Setup database for all tests in this file
setupTestDB();

describe('ExampleService', () => {
  describe('create', () => {
    it('should create a new example', async () => {
      const data = {
        name: 'New Example',
        description: 'Test description',
        status: 'draft' as const,
        tags: ['test'],
        metadata: { key: 'value' },
        isPublic: false,
      };

      const example = await exampleService.create(MOCK_USER_ID, data);

      expect(example).toBeDefined();
      expect(example.name).toBe(data.name);
      expect(example.description).toBe(data.description);
      expect(example.userId).toBe(MOCK_USER_ID);
      expect(example.status).toBe('draft');
      expect(example.tags).toEqual(['test']);
      expect(example.isPublic).toBe(false);
    });

    it('should throw ConflictError if example with same name exists for user', async () => {
      const data = {
        name: 'Duplicate Name',
        description: 'Test',
        status: 'draft' as const,
        isPublic: false,
      };

      // Create first example
      await exampleService.create(MOCK_USER_ID, data);

      // Try to create duplicate
      await expect(
        exampleService.create(MOCK_USER_ID, data)
      ).rejects.toThrow(ConflictError);
    });

    it('should allow same name for different users', async () => {
      const data = {
        name: 'Same Name',
        description: 'Test',
        status: 'draft' as const,
        isPublic: false,
      };

      const example1 = await exampleService.create(MOCK_USER_ID, data);
      const example2 = await exampleService.create(MOCK_USER_ID_2, data);

      expect(example1.userId).toBe(MOCK_USER_ID);
      expect(example2.userId).toBe(MOCK_USER_ID_2);
      expect(example1.name).toBe(example2.name);
    });
  });

  describe('getById', () => {
    it('should get an example by ID', async () => {
      const created = await createMockExample(MOCK_USER_ID);
      const found = await exampleService.getById(
        (created._id as any).toString(),
        MOCK_USER_ID
      );

      expect(found).toBeDefined();
      expect((found._id as any).toString()).toBe((created._id as any).toString());
      expect(found.name).toBe(created.name);
    });

    it('should throw NotFoundError if example does not exist', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await expect(
        exampleService.getById(fakeId, MOCK_USER_ID)
      ).rejects.toThrow(NotFoundError);
    });

    it('should allow access to public examples', async () => {
      const created = await createMockExample(MOCK_USER_ID, {
        isPublic: true,
      });

      const found = await exampleService.getById(
        (created._id as any).toString(),
        MOCK_USER_ID_2
      );

      expect(found).toBeDefined();
      expect(found.isPublic).toBe(true);
    });

    it('should deny access to private examples from other users', async () => {
      const created = await createMockExample(MOCK_USER_ID, {
        isPublic: false,
      });

      await expect(
        exampleService.getById((created._id as any).toString(), MOCK_USER_ID_2)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should increment view count when requested', async () => {
      const created = await createMockExample(MOCK_USER_ID, {
        isPublic: true,
      });
      const initialViews = created.viewCount;

      await exampleService.getById(
        (created._id as any).toString(),
        MOCK_USER_ID_2,
        true
      );

      const updated = await Example.findById(created._id);
      expect(updated?.viewCount).toBe(initialViews + 1);
    });

    it('should not increment view count for owner', async () => {
      const created = await createMockExample(MOCK_USER_ID);
      const initialViews = created.viewCount;

      await exampleService.getById(
        (created._id as any).toString(),
        MOCK_USER_ID,
        true
      );

      const updated = await Example.findById(created._id);
      expect(updated?.viewCount).toBe(initialViews);
    });
  });

  describe('list', () => {
    it('should list examples with pagination', async () => {
      await createMockExamples(5, MOCK_USER_ID, { isPublic: true });

      const result = await exampleService.list(
        { page: 1, limit: 3, sortBy: 'createdAt', order: 'desc' },
        MOCK_USER_ID
      );

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(3);
    });

    it('should filter by status', async () => {
      await createMockExample(MOCK_USER_ID, { status: 'draft' });
      await createMockExample(MOCK_USER_ID, { status: 'published', isPublic: true });
      await createMockExample(MOCK_USER_ID, { status: 'archived' });

      const result = await exampleService.list(
        { page: 1, limit: 10, status: 'published', sortBy: 'createdAt', order: 'desc' },
        MOCK_USER_ID
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.status).toBe('published');
    });

    it('should filter by tags', async () => {
      await createMockExample(MOCK_USER_ID, { tags: ['tag1', 'tag2'], isPublic: true });
      await createMockExample(MOCK_USER_ID, { tags: ['tag2', 'tag3'], isPublic: true });
      await createMockExample(MOCK_USER_ID, { tags: ['tag3'], isPublic: true });

      const result = await exampleService.list(
        { page: 1, limit: 10, tags: ['tag2'], sortBy: 'createdAt', order: 'desc' },
        MOCK_USER_ID
      );

      expect(result.data).toHaveLength(2);
    });

    it('should exclude soft-deleted examples', async () => {
      const example1 = await createMockExample(MOCK_USER_ID, { isPublic: true });
      await createMockExample(MOCK_USER_ID, { isPublic: true });

      // Soft delete one
      await example1.softDelete();

      const result = await exampleService.list(
        { page: 1, limit: 10, sortBy: 'createdAt', order: 'desc' },
        MOCK_USER_ID
      );

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('update', () => {
    it('should update an example', async () => {
      const created = await createMockExample(MOCK_USER_ID);
      const updates = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      const updated = await exampleService.update(
        (created._id as any).toString(),
        MOCK_USER_ID,
        updates
      );

      expect(updated.name).toBe(updates.name);
      expect(updated.description).toBe(updates.description);
    });

    it('should throw NotFoundError if example does not exist', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await expect(
        exampleService.update(fakeId, MOCK_USER_ID, { name: 'New Name' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user is not the owner', async () => {
      const created = await createMockExample(MOCK_USER_ID);

      await expect(
        exampleService.update((created._id as any).toString(), MOCK_USER_ID_2, {
          name: 'Hacked Name',
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ConflictError on duplicate name', async () => {
      await createMockExample(MOCK_USER_ID, { name: 'Existing Name' });
      const example2 = await createMockExample(MOCK_USER_ID, { name: 'Other Name' });

      await expect(
        exampleService.update((example2._id as any).toString(), MOCK_USER_ID, {
          name: 'Existing Name',
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('delete', () => {
    it('should soft delete an example', async () => {
      const created = await createMockExample(MOCK_USER_ID);

      await exampleService.delete((created._id as any).toString(), MOCK_USER_ID);

      const deleted = await Example.findById(created._id).setOptions({ includeDeleted: true });
      expect(deleted).toBeDefined();
      expect(deleted?.deletedAt).toBeDefined();
      expect(deleted?.deletedAt).not.toBeNull();
    });

    it('should throw NotFoundError if example does not exist', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await expect(
        exampleService.delete(fakeId, MOCK_USER_ID)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user is not the owner', async () => {
      const created = await createMockExample(MOCK_USER_ID);

      await expect(
        exampleService.delete((created._id as any).toString(), MOCK_USER_ID_2)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('publish', () => {
    it('should publish an example', async () => {
      const created = await createMockExample(MOCK_USER_ID, { status: 'draft' });

      const published = await exampleService.publish(
        (created._id as any).toString(),
        MOCK_USER_ID,
        true
      );

      expect(published.status).toBe('published');
      expect(published.isPublic).toBe(true);
      expect(published.publishedAt).toBeDefined();
    });

    it('should publish without making public', async () => {
      const created = await createMockExample(MOCK_USER_ID, { status: 'draft' });

      const published = await exampleService.publish(
        (created._id as any).toString(),
        MOCK_USER_ID,
        false
      );

      expect(published.status).toBe('published');
      expect(published.isPublic).toBe(false);
    });

    it('should throw ForbiddenError if user is not the owner', async () => {
      const created = await createMockExample(MOCK_USER_ID);

      await expect(
        exampleService.publish((created._id as any).toString(), MOCK_USER_ID_2)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('archive', () => {
    it('should archive an example', async () => {
      const created = await createMockExample(MOCK_USER_ID, {
        status: 'published',
        isPublic: true,
      });

      const archived = await exampleService.archive(
        (created._id as any).toString(),
        MOCK_USER_ID
      );

      expect(archived.status).toBe('archived');
      expect(archived.isPublic).toBe(false);
    });

    it('should throw ForbiddenError if user is not the owner', async () => {
      const created = await createMockExample(MOCK_USER_ID);

      await expect(
        exampleService.archive((created._id as any).toString(), MOCK_USER_ID_2)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      await createMockExample(MOCK_USER_ID, { status: 'draft' });
      await createMockExample(MOCK_USER_ID, { status: 'published' });
      await createMockExample(MOCK_USER_ID, { status: 'published' });
      await createMockExample(MOCK_USER_ID, { status: 'archived' });

      const stats = await exampleService.getUserStats(MOCK_USER_ID);

      expect(stats.total).toBe(4);
      expect(stats.byStatus.draft).toBe(1);
      expect(stats.byStatus.published).toBe(2);
      expect(stats.byStatus.archived).toBe(1);
    });

    it('should exclude deleted examples from stats', async () => {
      const example1 = await createMockExample(MOCK_USER_ID);
      await createMockExample(MOCK_USER_ID);

      // Delete one
      await example1.softDelete();

      const stats = await exampleService.getUserStats(MOCK_USER_ID);

      expect(stats.total).toBe(1);
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple examples', async () => {
      const example1 = await createMockExample(MOCK_USER_ID);
      const example2 = await createMockExample(MOCK_USER_ID);
      const example3 = await createMockExample(MOCK_USER_ID);

      const result = await exampleService.bulkDelete(
        [
          (example1._id as any).toString(),
          (example2._id as any).toString(),
          (example3._id as any).toString(),
        ],
        MOCK_USER_ID
      );

      expect(result.deleted).toBe(3);
      expect(result.failed).toHaveLength(0);
    });

    it('should track failed deletions', async () => {
      const example1 = await createMockExample(MOCK_USER_ID);
      const fakeId = '507f1f77bcf86cd799439011';

      const result = await exampleService.bulkDelete(
        [(example1._id as any).toString(), fakeId],
        MOCK_USER_ID
      );

      expect(result.deleted).toBe(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]).toBe(fakeId);
    });
  });
});
