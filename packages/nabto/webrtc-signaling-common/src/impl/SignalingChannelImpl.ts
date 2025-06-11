import { JSONValue } from '../JSONValue'
import { SignalingChannel, SignalingChannelEventHandlers } from '../SignalingChannel'
import { SignalingChannelState } from '../SignalingChannelState'
import { SignalingError, SignalingErrorCodes } from '../SignalingError'
import { TypedEventEmitter } from './TypedEventEmitter'
import { Reliability, ReliabilityMessageSchema, ReliabilityUnion } from './Reliability'

/**
 * Interface which the signaling channel implementation uses when it
 * communicates with the signaling service.
 */
export interface SignalingServiceImpl {
  serviceSendError(channelId: string, error: SignalingError): Promise<void>
  sendRoutingMessage(channelId: string, message: JSONValue): void
  closeSignalingChannel(channelId: string): void
}

enum OperationType {
  NEW_CHANNEL,
  MESSAGE
}

interface NewChannelOperation {
  type: OperationType.NEW_CHANNEL
  operation: () => Promise<void>
}

interface MessageOperation {
  type: OperationType.MESSAGE
  message: JSONValue
}

type Operation = NewChannelOperation | MessageOperation

export class SignalingChannelImpl extends TypedEventEmitter<SignalingChannelEventHandlers> implements SignalingChannel {

  reliability: Reliability;

  // Array of operations which needs to be handled synchronous by the receiving
  // application. Since they are async operations we need a queue to ensure the
  // correct delivery order.
  operations: Array<Operation> = new Array<Operation>();

  // set to true while handling received messages, such that we can let the
  // queue handle one message at a time.
  handlingOperations: boolean = false;

  ready: boolean = true;

  // the initial operation is used to synchronize onNewSingnalingChannel such that the async operation finished before messages are dispatched on the channel.
  constructor(private signalingService: SignalingServiceImpl, public channelId: string | undefined, initialOperation?: () => Promise<void>) {
    super()
    this.reliability = new Reliability((message: ReliabilityUnion) => { signalingService.sendRoutingMessage(this.getChannelIdInternal(), message); });

    if (initialOperation) {
      this.operations.push({ type: OperationType.NEW_CHANNEL, operation: initialOperation })
    }

    this.on("error", (_err: unknown) => {
      this.channelState = SignalingChannelState.FAILED
    })
  }

  getChannelIdInternal(): string {
    return this.channelId ? this.channelId : "channelid_not_set_yet"
  }

  channelState_: SignalingChannelState = SignalingChannelState.NEW

  get channelState(): SignalingChannelState {
    return this.channelState_;
  }

  set channelState(state: SignalingChannelState) {
    if (state === this.channelState_) {
      // remote duplicate updates.
      return;
    }
    this.channelState_ = state;
    this.emitSync("channelstatechange");
  }

  async sendMessage(message: JSONValue): Promise<void> {
    if (this.channelState === SignalingChannelState.CLOSED || this.channelState === SignalingChannelState.FAILED) {
      throw new Error("Cannot send message on a closed or failed channel.");
    }
    await this.reliability.sendReliableMessage(message);
  }
  async sendError(error: SignalingError): Promise<void> {
    if (this.channelState === SignalingChannelState.CLOSED || this.channelState === SignalingChannelState.FAILED) {
      return;
    }
    this.signalingService.serviceSendError(this.getChannelIdInternal(), error);
    this.channelState = SignalingChannelState.FAILED;
  }

  close(): void {
    if (this.channelState === SignalingChannelState.CLOSED) {
      return;
    }
    if (this.channelState !== SignalingChannelState.FAILED) {
      this.signalingService.serviceSendError(this.getChannelIdInternal(), new SignalingError(SignalingErrorCodes.CHANNEL_CLOSED, "The channel has been closed."))
    }
    this.operations = [];
    this.channelState = SignalingChannelState.CLOSED;
    this.signalingService.closeSignalingChannel(this.getChannelIdInternal());
    this.removeAllListeners();

  }

  static parseReliabilityMessage(message: JSONValue): ReliabilityUnion {
    const parsed = message;
    const result = ReliabilityMessageSchema.safeParse(parsed)
    if (!result.success) {
      throw new SignalingError(SignalingErrorCodes.DECODE_ERROR, `The message is not understood ${message} discarding the message. Error: ${result.error}`)
    } else {
      return result.data;
    }
  }

  handleRoutingMessage(message: JSONValue) {
    try {
      if (this.channelState === SignalingChannelState.CLOSED || this.channelState === SignalingChannelState.FAILED) {
        return;
      }

      const parsed = SignalingChannelImpl.parseReliabilityMessage(message);
      const reliableMessage = this.reliability.handleRoutingMessage(parsed);
      if (reliableMessage) {
        this.operations.push({ type: OperationType.MESSAGE, message: reliableMessage })
        this.handleOperations()
      }
    } catch (e) {
      this.handleErrorInThisComponent(e);
    }
  }

  handleWebSocketConnect() {
    if (this.channelState === SignalingChannelState.CLOSED || this.channelState === SignalingChannelState.FAILED) {
      return;
    }
    this.reliability.handleConnect();
  }

  // This is called when a Signaling Error is received on the connection to the signaling service, for this channel id.
  handleError(e: Error) {
    if (this.channelState === SignalingChannelState.CLOSED || this.channelState === SignalingChannelState.FAILED) {
      return;
    }
    this.emitSync("error", e)
    this.channelState = SignalingChannelState.FAILED;
  }

  handlePeerConnected() {
    if (this.channelState === SignalingChannelState.CLOSED || this.channelState === SignalingChannelState.FAILED) {
      return;
    }
    this.channelState = SignalingChannelState.CONNECTED;
    this.reliability.handlePeerConnected();
  }

  handlePeerOffline() {
    if (this.channelState === SignalingChannelState.CLOSED || this.channelState === SignalingChannelState.FAILED) {
      return;
    }
    this.channelState = SignalingChannelState.DISCONNECTED;
  }

  /**
   * Handle an error which occurs in this component. Such as a decode error.
   */
  handleErrorInThisComponent(error: unknown) {
    this.sendError(SignalingError.fromUnknown(error));
    this.emitSync("error", error);
  }

  static isInitialMessage(message: JSONValue): boolean {
    const parsed = SignalingChannelImpl.parseReliabilityMessage(message);
    return Reliability.isInitialMessage(parsed)
  }

  async handleOperations() {
    if (this.channelState === SignalingChannelState.CLOSED || this.channelState === SignalingChannelState.FAILED) {
      return;
    }
    if (this.ready) {
      if (this.handlingOperations === false) {
        if (this.operations.length > 0) {
          this.handlingOperations = true;
          const op = this.operations.shift();
          if (op) {
            if (op.type === OperationType.NEW_CHANNEL) {
              try {
                await op.operation();
              } catch (e) {
                console.error("Exception thrown in onNewSignalingChannel, this is not supported.", e);
              }
            } else if (op.type === OperationType.MESSAGE) {
              const consumers = await this.emit("message", op.message);
              if (consumers === 0) {
                console.error(`No message receivers is registered for the message: ${JSON.stringify(op.message)}. The message will be discarded.`);
              }
            }
          }
          this.handlingOperations = false;
          this.handleOperations();
        }
      }
    }
  }
}
