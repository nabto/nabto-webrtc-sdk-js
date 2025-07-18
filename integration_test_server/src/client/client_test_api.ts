import { Elysia, t } from "elysia";
import { TestClientOptionsSchema, testClientsPlugin } from "./TestClientInstance";

export const clientTestApi = new Elysia({ prefix: "/test/client" })
  .use(testClientsPlugin)
  .post("/", async ({ body, testClients }) => {
    const testClient = testClients.createTestClient(body)
    return {
      productId: testClient.productId,
      deviceId: testClient.deviceId,
      testId: testClient.testId,
      endpointUrl: testClient.endpointUrl,
      accessToken: testClient.accessToken
    }
  }, {
    body: TestClientOptionsSchema,
    response: {
      200: t.Object(
        {
          productId: t.String(),
          deviceId: t.String(),
          endpointUrl: t.String(),
          testId: t.String(),
          accessToken: t.String()
        }, { description: "success" }
      ),
      400: t.String({ description: "failure" })
    }
  })
  .post("/:testId/connect-device", async ({ error, params, testClients }) => {
    const test = testClients.getByTestId(params.testId);
    if (!test) {
      return error(404, "No such test id")
    }
    await test.connectDevice();
    return {}
  }, {
    response: {
      200: t.Object({}, { description: "success" }
      ),
      404: t.String({ description: "failure" })
    }
  })
  .post("/:testId/disconnect-device", async ({ error, params, testClients }) => {
    const test = testClients.getByTestId(params.testId);
    if (!test) {
      return error(404, "No such test id")
    }
    await test.disconnectDevice();
    return {}
  }, {
    response: {
      200: t.Object({}, { description: "success" }
      ),
      404: t.String({ description: "failure" })
    }
  })
  .post("/:testId/drop-device-messages", async ({ error, params, testClients }) => {
    const test = testClients.getByTestId(params.testId);
    if (!test) {
      return error(404, "No such test id")
    }
    await test.dropDeviceMessages();
    return {}
  }, {
    response: {
      200: t.Object({}, { description: "success" }
      ),
      404: t.String({ description: "failure" })
    }
  })
  .post("/:testId/disconnect-client", async ({ error, params, testClients }) => {
    const test = testClients.getByTestId(params.testId);
    if (!test) {
      return error(404, "No such test id")
    }
    test.disconnectClient();
    return {}
  }, {
    response: {
      200: t.Object({}, { description: "success" }
      ),
      404: t.String({ description: "failure" })
    }
  })
  .post("/:testId/drop-client-messages", async ({ error, params, testClients }) => {
    const test = testClients.getByTestId(params.testId);
    if (!test) {
      return error(404, "No such test id")
    }
    test.dropClientMessages();
    return {}
  }, {
    response: {
      200: t.Object({}, { description: "success" }
      ),
      404: t.String({ description: "failure" })
    }
  })

  .post("/:testId/wait-for-device-messages", async ({ error, params, testClients, body }) => {
    const test = testClients.getByTestId(params.testId);
    if (!test) {
      return error(404, "No such test id")
    }
    const messages = await test.waitForMessages(body.messages, body.timeout);
    return {
      messages: messages
    }
  },
    {
      body: t.Object({
        messages: t.Array(t.Unknown()),
        timeout: t.Number({format: "double"})
      }),
      response: {
        200: t.Object({
          messages: t.Optional(t.Array(t.Unknown()))
        }, { description: "success" }
        ),
        404: t.String({ description: "failure" })
      }
    }
  )
  .post("/:testId/wait-for-device-error", async ({ error, params, testClients, body }) => {
    const test = testClients.getByTestId(params.testId);
    if (!test) {
      return error(404, "No such test id")
    }
    const e = await test.waitForDeviceError(body.timeout);
      return {
        error: e
    }
  },
    {
      body: t.Object({
        timeout: t.Number({format: "double"})
      }),
      response: {
        200: t.Object({
          error: t.Optional(t.Object({
            code: t.String(),
            message: t.Optional(t.String())
          }))
        }, { description: "success" }
        ),
        404: t.String({ description: "failure" })
      }
    }
  )
  .post("/:testId/send-device-messages", async ({ params, body, testClients, error }) => {
    const test = testClients.getByTestId(params.testId);
    if (!test) {
      return error(404, "No such test id")
    }
    console.log(`Sending device messages: ${JSON.stringify(body.messages)}`);
    await test.deviceSendMessages(body.messages);
    return {}
  },
    {
      body: t.Object({
        messages: t.Array(t.Unknown())
      }),
      response: {
        200: t.Object({}, { description: "success" }),
        404: t.String({ description: "failure" })
      }
    }
  )
  .post("/:testId/send-device-error", async ({ params, body, testClients, error }) => {
    const test = testClients.getByTestId(params.testId);
    if (!test) {
      return error(404, "No such test id")
    }
    await test.deviceSendError(body.errorCode, body.errorMessage);
    return {}
  },
    {
      body: t.Object({
        errorCode: t.String(),
        errorMessage: t.Optional(t.String()),
      }),
      response: {
        200: t.Object({}, { description: "success" }),
        404: t.String({ description: "failure" })
      }
    }
  )
  .post("/:testId/send-new-message-type", async ({ params, testClients, error }) => {
    const test = testClients.getByTestId(params.testId);
    if (!test) {
      return error(404, "No such test id")
    }
    await test.sendNewMessageType();
    return {}
  },
    {
      body: t.Object({}),
      response: {
        200: t.Object({}, { description: "success" }),
        404: t.String({ description: "failure" })
      }
    }
  )
  .post("/:testId/send-new-field-in-known-message-type", async ({ params, testClients, error }) => {
    const test = testClients.getByTestId(params.testId);
    if (!test) {
      return error(404, "No such test id")
    }
    await test.sendNewFieldInKnownMessageType();
    return {}
  },
    {
      body: t.Object({}),
      response: {
        200: t.Object({}, { description: "success" }),
        404: t.String({ description: "failure" })
      }
    }
)
  .post("/:testId/get-active-websockets", async ({ params, testClients, error }) => {
    const test = testClients.getByTestId(params.testId);
    if (!test) {
      return error(404, "No such test id")
    }
    const activeWebSockets = await test.getActiveWebSockets();
    return {activeWebSockets: activeWebSockets}
  },
    {
      body: t.Object({}),
      response: {
        200: t.Object({
          "activeWebSockets": t.Number()
        }, { description: "success" }),
        404: t.String({ description: "failure" })
      }
    }
  )
  .delete("/:testId", async ({ params, testClients }) => {
    testClients.deleteTest(params.testId);
    return {
    }
  }, {
    response: {
      200: t.Object({}, { description: "success" })
    }
  })
