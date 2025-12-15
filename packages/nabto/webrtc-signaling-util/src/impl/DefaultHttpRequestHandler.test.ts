import { test, expect, describe, vi, beforeEach, afterEach } from 'vitest';
import { DefaultHttpRequestHandler } from './DefaultHttpRequestHandler';

// Mock fetch globally
const originalFetch = global.fetch;

describe('DefaultHttpRequestHandler', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = vi.fn();
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  test('can make GET request to configured service', async () => {
    const mockResponse = {
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      text: async () => JSON.stringify({ message: 'Hello' })
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const handler = new DefaultHttpRequestHandler({
      services: [
        { name: 'test-service', baseUrl: 'http://localhost:8080' }
      ]
    });

    const response = await handler.onRequest({
      service: 'test-service',
      method: 'GET',
      target: '/api/hello'
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/hello',
      expect.objectContaining({
        method: 'GET'
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/json');

    const body = JSON.parse(atob(response.body!));
    expect(body.message).toBe('Hello');
  });

  test('can make POST request with body', async () => {
    const mockResponse = {
      status: 201,
      headers: new Map([['content-type', 'application/json']]),
      text: async () => JSON.stringify({ created: true })
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const handler = new DefaultHttpRequestHandler({
      services: [
        { name: 'api', baseUrl: 'http://localhost:3000' }
      ]
    });

    const requestBody = { name: 'test' };
    const response = await handler.onRequest({
      service: 'api',
      method: 'POST',
      target: '/items',
      headers: { 'Content-Type': 'application/json' },
      body: btoa(JSON.stringify(requestBody))
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/items',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
    );

    expect(response.status).toBe(201);
  });

  test('throws error for unknown service', async () => {
    const handler = new DefaultHttpRequestHandler({
      services: [
        { name: 'service1', baseUrl: 'http://localhost:8080' }
      ]
    });

    await expect(
      handler.onRequest({
        service: 'unknown-service',
        method: 'GET',
        target: '/test'
      })
    ).rejects.toThrow('Service not found: unknown-service');
  });

  test('handles fetch errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const handler = new DefaultHttpRequestHandler({
      services: [
        { name: 'test', baseUrl: 'http://localhost:8080' }
      ]
    });

    await expect(
      handler.onRequest({
        service: 'test',
        method: 'GET',
        target: '/api/test'
      })
    ).rejects.toThrow('HTTP request failed: Network error');
  });

  test('handles empty response body', async () => {
    const mockResponse = {
      status: 204,
      headers: new Map(),
      text: async () => ''
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const handler = new DefaultHttpRequestHandler({
      services: [
        { name: 'test', baseUrl: 'http://localhost:8080' }
      ]
    });

    const response = await handler.onRequest({
      service: 'test',
      method: 'DELETE',
      target: '/item/123'
    });

    expect(response.status).toBe(204);
    expect(response.body).toBeUndefined();
  });

  test('forwards custom headers', async () => {
    const mockResponse = {
      status: 200,
      headers: new Map(),
      text: async () => 'OK'
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const handler = new DefaultHttpRequestHandler({
      services: [
        { name: 'api', baseUrl: 'http://localhost:8080' }
      ]
    });

    await handler.onRequest({
      service: 'api',
      method: 'GET',
      target: '/protected',
      headers: {
        'Authorization': 'Bearer token123',
        'X-Custom-Header': 'value'
      }
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/protected',
      expect.objectContaining({
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'value'
        }
      })
    );
  });
});
