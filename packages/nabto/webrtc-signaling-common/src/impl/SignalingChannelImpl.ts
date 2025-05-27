import { JSONValue } from '../JSONValue'
import { SignalingChannel, SignalingChannelEventHandlers } from '../SignalingChannel'
import { SignalingChannelState } from '../SignalingChannelState'
import { SignalingErrorCodes } from '../SignalingError'
import { TypedEventEmitter } from './TypedEventEmitter'
import { Reliability, ReliabilityMessageSchema, ReliabilityUnion } from './Reliability'

/**
 * Interface which the signaling channel implementation uses when it
 * communicates with the signaling service.
 */
export interface SignalingServiceImpl {
  serviceSendError(channelId: string, errorCode: string, errorMessage?: string): Promise<void>
  sendRoutingMessage(channelId: string, message: JSONValue): void
  closeSignalingChannel(channelId: string): void
}

export class SignalingChannelImpl extends TypedEventEmitter<SignalingChannelEventHandlers> implements SignalingChannel {

  reliability: Reliability;

  // array of received signaling messages which is handled serially in the webrtc connection
  receivedMessages: Array<JSONValue> = new Array<JSONValue>()
  // set to true while handling received messages, such that we can let the
  // queue handle one message at a time.
  handlingReceivedMessages: boolean = false;

  readyToEmitMessages: boolean = false;

  constructor(private signalingService: SignalingServiceImpl, public channelId: string | undefined, public isDevice: boolean) {
    super()
    this.reliability = new Reliability((message: ReliabilityUnion) => { signalingService.sendRoutingMessage(this.getChannelIdInternal(), message); });

    this.on("error", (_err: Error) => {
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
    this.emit("channelstatechange");
  }

  async sendMessage(message: JSONValue): Promise<void> {
    await this.reliability.sendReliableMessage(message);
  }
  async sendError(errorCode: string, errorMessage?: string): Promise<void> {
    this.signalingService.serviceSendError(this.getChannelIdInternal(), errorCode, errorMessage);
  }

  close(): void {
    if (this.channelState === SignalingChannelState.CLOSED) {
      return;
    }
    this.channelState = SignalingChannelState.CLOSED;
    this.signalingService.serviceSendError(this.getChannelIdInternal(), SignalingErrorCodes.CHANNEL_CLOSED, "The channel has been closed.")
    this.signalingService.closeSignalingChannel(this.getChannelIdInternal());
    this.removeAllListeners();

  }

  parseReliabilityMessage(message: JSONValue): ReliabilityUnion | undefined {
    try {
      const parsed = message;
      const result = ReliabilityMessageSchema.safeParse(parsed)
      if (!result.success) {
        console.debug(`The message is not understood ${message} discarding the message. Error: ${result.error}`)
      } else {
        return result.data;
      }
    } catch {
      console.error(`Cannot parse ${message} as json`)
    }
  }

  handleRoutingMessage(message: JSONValue) {
    if (this.channelState === SignalingChannelState.CLOSED || this.channelState === SignalingChannelState.FAILED) {
      return;
    }
    const parsed = this.parseReliabilityMessage(message);
    if (parsed) {
      const reliableMessage = this.reliability.handleRoutingMessage(parsed);
      if (reliableMessage) {
        this.receivedMessages.push(reliableMessage)
        this.handleReceivedMessages()
      }
    }
  }

  handleWebSocketConnect() {
    if (this.channelState === SignalingChannelState.CLOSED || this.channelState === SignalingChannelState.FAILED) {
      return;
    }
    this.reliability.handleConnect();
  }

  handleError(e: Error) {
    if (this.channelState === SignalingChannelState.CLOSED || this.channelState === SignalingChannelState.FAILED) {
      return;
    }
    this.emit("error", e)
  }

  handlePeerConnected() {
    if (this.channelState === SignalingChannelState.CLOSED || this.channelState === SignalingChannelState.FAILED) {
      return;
    }
    this.channelState = SignalingChannelState.ONLINE;
    this.reliability.handlePeerConnected();
  }

  handlePeerOffline() {
    if (this.channelState === SignalingChannelState.CLOSED || this.channelState === SignalingChannelState.FAILED) {
      return;
    }
    this.channelState = SignalingChannelState.OFFLINE;
  }

  isInitialMessage(message: JSONValue): boolean {
    const parsed = this.parseReliabilityMessage(message);
    if (parsed) {
      return this.reliability.isInitialMessage(parsed)
    }
    return false;
  }

  async handleReceivedMessages() {
    if (this.readyToEmitMessages) {
      if (this.handlingReceivedMessages === false) {
        if (this.receivedMessages.length > 0) {
          this.handlingReceivedMessages = true;
          const msg = this.receivedMessages.shift();
          if (msg) {
            const consumers = await this.emit("message", msg);
            if (consumers === 0) {
              console.error(`No message receivers is registered for the message: ${JSON.stringify(msg)}. The message will be discarded.`);
            }
          }
          this.handlingReceivedMessages = false;
          this.handleReceivedMessages();
        }
      }
    }
  }

  startRecv() {
    this.readyToEmitMessages = true;
    this.handleReceivedMessages();
  }
}
