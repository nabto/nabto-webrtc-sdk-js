import { test, assert } from 'vitest'
import { WebSocketConnectionImpl } from "./WebSocketConnectionImpl";

import { fastify, FastifyInstance } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { WebSocketCloseReason } from './WebSocketConnection';

interface WSSServerOptions {
  failearly?: boolean
}

class WSSServer {
  fastify: FastifyInstance
  constructor(private options: WSSServerOptions) {
    this.fastify = fastify({ logger: false });

    this.fastify.register(fastifyWebsocket);

    this.fastify.register(async (fastify) => {
      fastify.addHook('preValidation', async (request, reply) => {
        // check if the request is authenticated
        if (this.options.failearly) {
          await reply.code(401).send("not authenticated");
        }
      })

      fastify.get('/', { websocket: true }, (socket, _req) => {
        socket.on('message', (message: string) => {
          fastify.log.info(`Received message: ${message}`);
          socket.send('hi from server');
        });

        socket.on('close', () => {
          fastify.log.info('Client disconnected');
        });
      });
    });
  }

  async start(): Promise<string> {
    const address = await this.fastify.listen({ port: 0 });
    return address;
  }
}

test('Test Websocket connect', async () => {
  const server = new WSSServer({});
  const address = await server.start();
  const ws = new WebSocketConnectionImpl("");
  const waitConnectedPromise = new Promise<boolean>((resolve: (status: boolean) => void, reject: (reason: unknown) => void) => {
    ws.on("open", () => resolve(true));
    ws.on("close", (error: WebSocketCloseReason) => reject(error))
    ws.on("error", (error: Error) => reject(error))
  })
  console.log(`server address: ${address}`)
  ws.connect(address)
  await waitConnectedPromise
})

test('Test Websocket failing connect', async () => {
  const ws = new WebSocketConnectionImpl("");
  const waitConnectedPromise = new Promise<boolean>((resolve: (status: boolean) => void, reject: (reason: unknown) => void) => {
    ws.on("open", () => resolve(true));
    ws.on("close", (error: WebSocketCloseReason) => reject(error))
    ws.on("error", (error: Error) => reject(error))
  })
  ws.connect("ws://127.0.0.1:4242")
  try {
    await waitConnectedPromise
    assert(false);
  } catch (e) {
    if (e instanceof Error) {
      // good
    } else {
      throw e
    }
  }
})

test('Test Websocket close just after connect', async () => {
  const ws = new WebSocketConnectionImpl("");
  const server = new WSSServer({ failearly: true });
  const address = await server.start();
  let connected = false;
  const waitConnectedPromise = new Promise<boolean>((resolve: (status: boolean) => void, reject: (reason: unknown) => void) => {
    ws.on("open", () => resolve(true));
    ws.on("close", (error: WebSocketCloseReason) => reject(error))
    ws.on("error", (error: Error) => reject(error))
  })
  ws.connect(address)
  try {
    await waitConnectedPromise;
    connected = true;
  } catch (e) {
    if (e instanceof Error) {
      // good
    } else {
      throw e
    }
  }
  assert.isFalse(connected)
})
