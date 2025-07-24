import { JSONValue, SignalingChannel, SignalingError, SignalingErrorCodes, TypedEventEmitter } from "@nabto/webrtc-signaling-common";
import { SignalingClient } from "@nabto/webrtc-signaling-client";
import { DefaultMessageEncoder, SignalingMessage } from "./DefaultMessageEncoder";
import { ClientMessageTransportOptions, ClientMessageTransportSecurityMode } from "../ClientMessageTransport";
import { MessageSigner } from "./MessageSigner";
import { NoneMessageSigner } from "./NoneMessageSigner";
import { JWTMessageSigner } from "./JWTMessageSigner";
import { MessageTransport, MessageTransportMode, WebrtcSignalingMessageType, WebrtcSignalingMessage } from "../MessageTransport";
import { SignalingMessageType } from "./DefaultMessageEncoder";

enum State {
  SETUP, // if we are exchanging SETUP_REQUEST/RESPONSE and aquiring ice servers.
  SIGNALING
}

interface ClientMessageTransportImplEventHandlers {
  webrtcsignalingmessage: (message: WebrtcSignalingMessage) => Promise<void>;
  error: (error: unknown) => void;
  setupdone: (iceServers?: RTCIceServer[]) => Promise<void>;
}

const logModule = "Client Message Transport";

export class ClientMessageTransportImpl extends TypedEventEmitter<ClientMessageTransportImplEventHandlers> implements MessageTransport {

  messageEncoder: DefaultMessageEncoder = new DefaultMessageEncoder();
  state: State = State.SETUP;
  iceServersPromise?: Promise<Array<RTCIceServer>>

  constructor(private signalingChannel: SignalingChannel, private messageSigner: MessageSigner) {
    super();
    this.signalingChannel.on("message", async (message: JSONValue) => { this.signalingChannelMessageHandler(message) });
  }

  static create(client: SignalingClient, options: ClientMessageTransportOptions): MessageTransport {
    let messageSigner: MessageSigner;
    if (options.securityMode === ClientMessageTransportSecurityMode.SHARED_SECRET) {
      messageSigner = new JWTMessageSigner(options.sharedSecret, options.keyId);
    } else {
      messageSigner = new NoneMessageSigner();
    }
    const instance = new ClientMessageTransportImpl(client, messageSigner);
    instance.start();

    return instance;
  }

  start(): void {
    try {
      this.sendSignalingMessage({ type: SignalingMessageType.SETUP_REQUEST });
    } catch (e) {
      this.emitError(e);
    }
  }

  /**
   * get a Signaling message and forward it, if it is a WebrtcSignalingMessage
   */
  async handleSignalingMessage(message: SignalingMessage) {
    if (this.state == State.SETUP) {
      if (message.type === SignalingMessageType.SETUP_RESPONSE) {
        console.debug(`${logModule}: Received a message of type (SETUP_RESPONSE) and invokes the setupdone event.`, message)
        this.emitSetupDone(message.iceServers);
      } else {
        throw new SignalingError(SignalingErrorCodes.DECODE_ERROR, `Wrong message type, expected a ${SignalingMessageType.SETUP_RESPONSE} but got ${message.type}`);
      }
    } else {
      if (message.type === WebrtcSignalingMessageType.CANDIDATE || message.type === WebrtcSignalingMessageType.DESCRIPTION) {
        console.debug(`${logModule}: Received a WebRTCSignalingMessage of type (${message.type}) and forwards it to the application.`, message);
        this.emitWebRTCSignalingMessage(message);
      } else {
        console.error(`Could not handle a signaling message of type (${message.type}). The message is dropped.`);
      }
    }
  }

  signalingChannelMessageHandler = async (message: JSONValue) => {
    try {
      const verified = await this.messageSigner.verifyMessage(message);
      const decoded = this.messageEncoder.decodeMessage(verified);

      await this.handleSignalingMessage(decoded);
    } catch (e) {
      console.error(`Could not handle message ${JSON.stringify(message)}`)
      await this.emitError(e)
    }
  }

  async emitError(error: unknown) {
    this.signalingChannel.sendError(SignalingError.fromUnknown(error));
    this.emitSync("error", error);
  }

  async emitSetupDone(iceServers?: RTCIceServer[]) {
    this.state = State.SIGNALING;
    const consumers = await this.emit("setupdone", iceServers);
    if (consumers === 0) {
      console.error(`No handlers is registered for setupdone, discarding the event.`);
    }
  }

  async emitWebRTCSignalingMessage(message: WebrtcSignalingMessage) {
    const consumers = await this.emit("webrtcsignalingmessage", message);
    if (consumers === 0) {
      console.error(`No webrtcsignaling event listeners registered for the message: ${JSON.stringify(message)}`)
    }
  }

  async sendWebrtcSignalingMessage(message: WebrtcSignalingMessage): Promise < void> {
    return this.sendSignalingMessage(message);
  }

  private async sendSignalingMessage(message: SignalingMessage): Promise<void> {
    const encoded = this.messageEncoder.encodeMessage(message);
    const signed = await this.messageSigner.signMessage(encoded);
    console.debug(`${logModule}: Sending a signaling message of type (${message.type}) to the remote peer.`, message)
    return this.signalingChannel.sendMessage(signed);
  }

  /**
   * In Nabto WebRTC the device is always the polite peer when doing perfect
   * negotiation.
   */
  get mode() : MessageTransportMode {
    return MessageTransportMode.CLIENT;
  }
}
