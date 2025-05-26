# Run integration tests

The integration tests are tested against an integration test server.

1. run the integration test server in ../../integration_test_server
2. generate openapi type definitions

```
npx @hey-api/openapi-ts -i http://127.0.0.1:13745/swagger/json -o integration_test/generated/client -c @hey-api/client-fetch
```

3. run the tests `npm run test:i`
