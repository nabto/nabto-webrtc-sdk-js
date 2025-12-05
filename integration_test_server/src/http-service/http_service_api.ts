import { Elysia, t } from "elysia";

/**
 * Mock HTTP service endpoints for testing JSON-RPC HTTP proxy
 * These endpoints can be invoked through the device's JSON-RPC HTTP proxy
 */
export const httpServiceApi = new Elysia({ prefix: "/http-service" })
  .get("/hello", () => {
    return {
      message: "Hello from HTTP service!",
      timestamp: new Date().toISOString()
    };
  })
  .post("/echo", async ({ body }) => {
    return {
      echo: body,
      receivedAt: new Date().toISOString()
    };
  }, {
    body: t.Any()
  })
  .get("/status/:code", ({ params, set }) => {
    const code = parseInt(params.code);
    set.status = code as any;
    return {
      status: code,
      message: `Status code ${code} requested`
    };
  })
  .get("/large", () => {
    // Return a large response to test size limits
    return {
      data: "x".repeat(10000),
      size: 10000
    };
  });
