import { Elysia, t } from 'elysia'
import bearer from "@elysiajs/bearer";
import { testDevicesPlugin } from '../device/DeviceTestInstance';
import { testClientsPlugin } from '../client/TestClientInstance';

const errorType = t.Object({
  message: t.Optional(t.String())
}, {description: "failure"});

const iceServersResponse = t.Object({
  iceServers: t.Array(t.Object({
    username: t.Optional(t.String()),
    credential: t.Optional(t.String()),
    urls: t.Array(t.String())
  }))
});

export const iceServersHttp = new Elysia()
  .use(bearer())
  .use(testDevicesPlugin)
  .use(testClientsPlugin)
  .post("/v1/ice-servers", async ({ testDevices, testClients, error, body: { productId, deviceId }, bearer }) => {

    const devicesTest = testDevices.getDeviceByProductId(productId);
    const clientsTest = testClients.getClientByProductId(productId);

    let test;
    if (devicesTest) {
      test = devicesTest;
    } else if (clientsTest) {
      test = clientsTest;
    } else {
      return error(404, { message: "No Such Test" });
    }

    if (!test) {
      return error(404, { message: "No Such Test" });
    }

    if (test.requireAccessToken) {
      if (!bearer) {
        return error(401, { message: "Unauthorized" });
      }
      if (bearer != test.accessToken) {
        return error(403, {message: "Access denied"})
      }
    }

    if (!bearer) {
      // No access token, return only STUN servers
      return {
        "iceServers":
          [
            {
              "urls": [
                "stun:stun1.nabto.com:4242",
                "stun:stun1.nabto.com:4243"
              ]
            },
            {
              "urls": [
                "stun:stun2.nabto.com:4242",
                "stun:stun2.nabto.com:4243"
              ]
            }
          ]
      }
    } else {
      return {
        "iceServers":
          [
            {
              "urls": [
                "stun:stun1.nabto.com:4242",
                "stun:stun1.nabto.com:4243"
              ]
            },
            {
              "urls": [
                "stun:stun2.nabto.com:4242",
                "stun:stun2.nabto.com:4243"
              ]
            },
            {
              "username": "turn1username",
              "credential": "turn1credential",
              "urls": [
                "turn:turn1.nabto.com:4242",
                "turn:turn1.nabto.com:4243"
              ]
            }
          ]
      }
    }
  }, {
    body: t.Object({
      deviceId: t.String(),
      productId: t.String(),
    }),
    headers: t.Object({
      authorization: t.Optional(t.String())
    }),
    response: {
      200: iceServersResponse,
      400: errorType,
      404: errorType,
      401: errorType,
      403: errorType
    }
  })
