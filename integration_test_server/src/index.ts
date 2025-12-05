import { Elysia } from "elysia";
import { clientTestApi } from './client/client_test_api'
import { swagger } from '@elysiajs/swagger'
import { TestClients, testClientsPlugin } from './client/TestClientInstance'
import { clientHttp, clientWs } from "./client/client_api";
import { deviceHttp, deviceWs } from "./device/device_api";
import { deviceTestApi } from "./device/device_test_api";
import { iceServersHttp } from "./ice-servers/ice_servers_api";
import { httpServiceApi } from "./http-service/http_service_api";

const app = new Elysia()
  .use(testClientsPlugin)
  .decorate("clients", new TestClients())
  .use(swagger())
  .onRequest(({ set, request }) => {
    console.log(`New request ${request.method} ${request.url}`)
  })
  // Middleware to log response
  .onAfterHandle(({ request, response, set }) => {
    console.log(`${request.method} ${request.url} ${set.status}`);
  })
  .onError(({request, response, set, code, error}) => {
    console.log(error, code)
    console.log(`${request.method} ${request.url} ${set.status}`);
  })
  .use(clientHttp)
  .use(clientWs)
  .use(deviceHttp)
  .use(deviceWs)
  .use(clientTestApi)
  .use(deviceTestApi)
  .use(iceServersHttp)
  .use(httpServiceApi)

const server = app.listen(13745)

console.log(
  `🦊 Elysia is running at ${server.server?.hostname}:${server.server?.port}`
);
