# Integration Tests for webrtc-signaling-util

## Current Tests

### HTTP Service Integration Test (`integration_test/tests/http_service.test.ts`)

Basic integration test that verifies the HTTP service endpoints on the integration_test_server are accessible. Currently includes:

1. ✅ Test that `/http-service/hello` endpoint responds correctly
2. ✅ Test that `/http-service/echo` endpoint echoes POST data
3. ✅ Test that `/http-service/status/:code` returns requested status codes

**What's Missing:** Full end-to-end test through WebRTC + JSON-RPC proxy (see TODO in test file)

## Running the Tests

**Prerequisites:** Start the integration_test_server first:
```bash
cd integration_test_server && bun dev
```

Then run the integration tests:
```bash
# From the root of webrtc-signaling-util
pnpm test:i --run

# Or from the monorepo root
pnpm --filter @nabto/webrtc-signaling-util test:i --run
```

## Protocol-Level Tests

The JSON-RPC protocol implementation is thoroughly tested in the standard test suite (`src/JsonRpcProtocol.test.ts`). These tests use local WebRTC peer connections with `@roamhq/wrtc` to verify:

- ✅ JSON-RPC 2.0 protocol correctness
- ✅ Data channel lifecycle management
- ✅ Request/response serialization (including base64)
- ✅ Error handling (HTTP vs JSON-RPC errors)
- ✅ Concurrent request handling
- ✅ Service listing functionality

Run with: `pnpm test-run`

## HTTP Service Endpoints

The integration_test_server provides the following HTTP service endpoints at `http://localhost:13745`:

- `GET /http-service/hello` - Returns a hello message
- `POST /http-service/echo` - Echoes back the request body
- `GET /http-service/status/:code` - Returns the requested HTTP status code
- `GET /http-service/large` - Returns a large response (10KB)

These can be used as targets for end-to-end JSON-RPC HTTP proxy testing.

## Future: Full End-to-End Test

A complete end-to-end integration test would establish a real WebRTC connection through the signaling server and proxy HTTP requests. See the TODO section in `integration_test/tests/http_service.test.ts` for the detailed flow.
