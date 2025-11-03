/**
 * API test helpers for integration tests
 */
import request from 'supertest';
import { Express } from 'express';

/**
 * Mock authentication token for testing
 */
export const MOCK_AUTH_TOKEN = 'test-auth-token';
export const MOCK_ADMIN_TOKEN = 'test-admin-token';

/**
 * Create authenticated request
 */
export const authenticatedRequest = (app: Express, token: string = MOCK_AUTH_TOKEN) => {
  return request(app).set('Authorization', `Bearer ${token}`);
};

/**
 * Create admin authenticated request
 */
export const adminRequest = (app: Express) => {
  return authenticatedRequest(app, MOCK_ADMIN_TOKEN);
};

/**
 * Make a GET request with auth
 */
export const authGet = (app: Express, url: string, token?: string) => {
  return authenticatedRequest(app, token).get(url);
};

/**
 * Make a POST request with auth
 */
export const authPost = (app: Express, url: string, data: any, token?: string) => {
  return authenticatedRequest(app, token).post(url).send(data);
};

/**
 * Make a PUT request with auth
 */
export const authPut = (app: Express, url: string, data: any, token?: string) => {
  return authenticatedRequest(app, token).put(url).send(data);
};

/**
 * Make a DELETE request with auth
 */
export const authDelete = (app: Express, url: string, token?: string) => {
  return authenticatedRequest(app, token).delete(url);
};
