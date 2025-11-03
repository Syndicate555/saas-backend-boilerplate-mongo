/**
 * Integration tests for Example API
 * Tests HTTP endpoints with full request/response cycle
 *
 * NOTE: These tests are currently EXCLUDED from the default test run.
 * They serve as examples and templates for when you're ready to add integration tests.
 *
 * To enable: Remove '/tests/integration/' from testPathIgnorePatterns in jest.config.js
 * To run: npm run test:integration
 *
 * Why excluded?
 * - Requires complex Express app mocking
 * - Needs authentication middleware setup
 * - Better suited for actual applications than boilerplate templates
 * - Unit tests provide better examples for starter projects
 *
 * See TESTING_RECOMMENDATIONS.md for guidance on when to add integration tests.
 */

import request from 'supertest';
import { Express } from 'express';
import { setupTestDB } from '../helpers/db.helper';
import {
  createMockExample,
  MOCK_USER_ID,
} from '../helpers/mock.helper';
import { authGet, authPost, authPut, authDelete } from '../helpers/api.helper';
import { createTestApp } from '../helpers/app.helper';

// Setup database for all tests in this file
setupTestDB();

describe('Example API Integration Tests', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  describe('POST /api/examples', () => {
    it('should create a new example with authentication', async () => {
      const data = {
        name: 'Test Example',
        description: 'Test description',
        status: 'draft',
        isPublic: false,
        tags: ['test'],
      };

      const response = await authPost(app, '/api/examples', data);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(data.name);
      expect(response.body.description).toBe(data.description);
    });

    it('should return 401 without authentication', async () => {
      const data = {
        name: 'Test Example',
        description: 'Test description',
        status: 'draft',
        isPublic: false,
      };

      const response = await request(app).post('/api/examples').send(data);

      expect(response.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const data = {
        description: 'Test description',
        // Missing required 'name' field
      };

      const response = await authPost(app, '/api/examples', data);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should validate field types', async () => {
      const data = {
        name: 'Test',
        status: 'invalid-status',
        isPublic: 'not-a-boolean',
      };

      const response = await authPost(app, '/api/examples', data);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/examples/:id', () => {
    it('should get an example by ID', async () => {
      const example = await createMockExample(MOCK_USER_ID, { isPublic: true });

      const response = await request(app).get(`/api/examples/${example._id}`);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(example.name);
    });

    it('should return 404 for non-existent example', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app).get(`/api/examples/${fakeId}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 for private example of another user', async () => {
      const example = await createMockExample(MOCK_USER_ID, { isPublic: false });

      const response = await authGet(app, `/api/examples/${example._id}`, 'other-user-token');

      expect(response.status).toBe(403);
    });

    it('should allow owner to access private example', async () => {
      const example = await createMockExample(MOCK_USER_ID, { isPublic: false });

      const response = await authGet(app, `/api/examples/${example._id}`);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(example.name);
    });
  });

  describe('GET /api/examples', () => {
    it('should list public examples', async () => {
      await createMockExample(MOCK_USER_ID, { isPublic: true, name: 'Public 1' });
      await createMockExample(MOCK_USER_ID, { isPublic: true, name: 'Public 2' });
      await createMockExample(MOCK_USER_ID, { isPublic: false, name: 'Private' });

      const response = await request(app).get('/api/examples');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
    });

    it('should support pagination', async () => {
      // Create 5 public examples
      for (let i = 0; i < 5; i++) {
        await createMockExample(MOCK_USER_ID, {
          isPublic: true,
          name: `Example ${i}`
        });
      }

      const response = await request(app)
        .get('/api/examples')
        .query({ page: 1, limit: 3 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(3);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(3);
    });

    it('should filter by status', async () => {
      await createMockExample(MOCK_USER_ID, {
        status: 'published',
        isPublic: true,
        name: 'Published Example'
      });
      await createMockExample(MOCK_USER_ID, {
        status: 'draft',
        isPublic: true,
        name: 'Draft Example'
      });

      const response = await request(app)
        .get('/api/examples')
        .query({ status: 'published' });

      expect(response.status).toBe(200);
      expect(response.body.data.every((ex: any) => ex.status === 'published')).toBe(true);
    });

    it('should filter by tags', async () => {
      await createMockExample(MOCK_USER_ID, {
        tags: ['typescript', 'nodejs'],
        isPublic: true,
        name: 'TS Example'
      });
      await createMockExample(MOCK_USER_ID, {
        tags: ['python'],
        isPublic: true,
        name: 'Python Example'
      });

      const response = await request(app)
        .get('/api/examples')
        .query({ tags: 'typescript' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PUT /api/examples/:id', () => {
    it('should update an example', async () => {
      const example = await createMockExample(MOCK_USER_ID);

      const updates = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      const response = await authPut(app, `/api/examples/${example._id}`, updates);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updates.name);
      expect(response.body.description).toBe(updates.description);
    });

    it('should return 401 without authentication', async () => {
      const example = await createMockExample(MOCK_USER_ID);

      const response = await request(app)
        .put(`/api/examples/${example._id}`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(401);
    });

    it('should return 403 when updating another users example', async () => {
      const example = await createMockExample(MOCK_USER_ID);

      const response = await authPut(
        app,
        `/api/examples/${example._id}`,
        { name: 'Hacked' },
        'other-user-token'
      );

      expect(response.status).toBe(403);
    });

    it('should validate update data', async () => {
      const example = await createMockExample(MOCK_USER_ID);

      const response = await authPut(app, `/api/examples/${example._id}`, {
        status: 'invalid-status',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/examples/:id', () => {
    it('should delete an example', async () => {
      const example = await createMockExample(MOCK_USER_ID);

      const response = await authDelete(app, `/api/examples/${example._id}`);

      expect(response.status).toBe(204);
    });

    it('should return 401 without authentication', async () => {
      const example = await createMockExample(MOCK_USER_ID);

      const response = await request(app).delete(`/api/examples/${example._id}`);

      expect(response.status).toBe(401);
    });

    it('should return 403 when deleting another users example', async () => {
      const example = await createMockExample(MOCK_USER_ID);

      const response = await authDelete(
        app,
        `/api/examples/${example._id}`,
        'other-user-token'
      );

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent example', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await authDelete(app, `/api/examples/${fakeId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/examples/:id/publish', () => {
    it('should publish an example', async () => {
      const example = await createMockExample(MOCK_USER_ID, { status: 'draft' });

      const response = await authPost(
        app,
        `/api/examples/${example._id}/publish`,
        { makePublic: true }
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('published');
      expect(response.body.isPublic).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const example = await createMockExample(MOCK_USER_ID);

      const response = await request(app)
        .post(`/api/examples/${example._id}/publish`)
        .send({ makePublic: true });

      expect(response.status).toBe(401);
    });

    it('should return 403 when publishing another users example', async () => {
      const example = await createMockExample(MOCK_USER_ID);

      const response = await authPost(
        app,
        `/api/examples/${example._id}/publish`,
        { makePublic: true },
        'other-user-token'
      );

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/examples/:id/archive', () => {
    it('should archive an example', async () => {
      const example = await createMockExample(MOCK_USER_ID, {
        status: 'published',
        isPublic: true
      });

      const response = await authPost(app, `/api/examples/${example._id}/archive`, {});

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('archived');
      expect(response.body.isPublic).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const example = await createMockExample(MOCK_USER_ID);

      const response = await request(app)
        .post(`/api/examples/${example._id}/archive`)
        .send({});

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/examples/bulk-delete', () => {
    it('should delete multiple examples', async () => {
      const example1 = await createMockExample(MOCK_USER_ID);
      const example2 = await createMockExample(MOCK_USER_ID);

      const response = await authPost(app, '/api/examples/bulk-delete', {
        ids: [(example1._id as any).toString(), (example2._id as any).toString()],
      });

      expect(response.status).toBe(200);
      expect(response.body.deleted).toBe(2);
      expect(response.body.failed).toHaveLength(0);
    });

    it('should handle failed deletions', async () => {
      const example1 = await createMockExample(MOCK_USER_ID);
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await authPost(app, '/api/examples/bulk-delete', {
        ids: [(example1._id as any).toString(), fakeId],
      });

      expect(response.status).toBe(200);
      expect(response.body.deleted).toBe(1);
      expect(response.body.failed).toHaveLength(1);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/examples/bulk-delete')
        .send({ ids: ['507f1f77bcf86cd799439011'] });

      expect(response.status).toBe(401);
    });

    it('should validate bulk delete input', async () => {
      const response = await authPost(app, '/api/examples/bulk-delete', {
        ids: [], // Empty array should fail validation
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/examples/stats', () => {
    it('should return user statistics', async () => {
      await createMockExample(MOCK_USER_ID, { status: 'draft' });
      await createMockExample(MOCK_USER_ID, { status: 'published' });

      const response = await authGet(app, '/api/examples/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('byStatus');
      expect(response.body.byStatus).toHaveProperty('draft');
      expect(response.body.byStatus).toHaveProperty('published');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/examples/stats');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/examples/popular', () => {
    it('should return popular examples', async () => {
      await createMockExample(MOCK_USER_ID, {
        isPublic: true,
        viewCount: 100
      });
      await createMockExample(MOCK_USER_ID, {
        isPublic: true,
        viewCount: 50
      });

      const response = await request(app).get('/api/examples/popular');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support limit parameter', async () => {
      const response = await request(app)
        .get('/api/examples/popular')
        .query({ limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });
});
