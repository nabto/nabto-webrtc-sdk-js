import { JSONValue, SignalingChannel, TypedEventEmitter } from "@nabto/webrtc-signaling-common";
import { SignalingDevice } from "@nabto/webrtc-signaling-device";
import { DefaultMessageEncoder, SignalingMessage } from "./DefaultMessageEncoder";
import { DefaultMessageTransportOptions, DefaultMessageTransportSecurityModes } from "../DefaultMessageTransport";
import { MessageSigner } from "./MessageSigner";
import { NoneMessageSigner } from "./NoneMessageSigner";
import { JWTMessageSigner } from "./JWTMessageSigner";
import { MessageTransport, MessageTransportMode, WebrtcSignalingMessageType, WebrtcSignalingMessage } from "../MessageTransport";
import { SignalingMessageType } from "./DefaultMessageEncoder";

enum State {
  SETUP, // if we are exchanging SETUP_REQUEST/RESPONSE and aquiring ice servers.
  SIGNALING
}

interface DefaultMessageTransportImplEventHandlers {
  webrtcsignalingmessage: (message: WebrtcSignalingMessage) => Promise<void>;
  error: (error: Error) => void;
  setupdone: (iceServers?: RTCIceServer[]) => Promise<void>;
}

export class DefaultMessageTransportDeviceImpl extends TypedEventEmitter<DefaultMessageTransportImplEventHandlers> implements MessageTransport {

  messageEncoder: DefaultMessageEncoder = new DefaultMessageEncoder();
  state: State = State.SETUP;
  iceServersPromise?: Promise<Array<RTCIceServer>>

  constructor(private device: SignalingDevice, private channel: SignalingChannel, private messageSigner: MessageSigner) {
    super();
    this.channel.on("message", async (message: JSONValue) => { this.signalingChannelMessageHandler(message) });
  }

  static create(device: SignalingDevice, channel: SignalingChannel, options: DefaultMessageTransportOptions) {
    let messageSigner: MessageSigner;
    if (options.securityMode === DefaultMessageTransportSecurityModes.SHARED_SECRET) {
      if (options.sharedSecret === undefined) {
        throw new Error("Missing a required shared secret")
      }
      messageSigner = new JWTMessageSigner(options.sharedSecret, options.keyId ? options.keyId : "default");
    } else {
      messageSigner = new NoneMessageSigner();
    }
    const instance = new DefaultMessageTransportDeviceImpl(device, channel, messageSigner);
    instance.start();

    return instance;
  }

  /**
   * Wait for a create request, once received, send a create response back to
   * the client.
   */
  start(): void {
    this.iceServersPromise = this.channel.getIceServers();

  }

  async handleDeviceSetupRequest() {
    try {
      if (!this.iceServersPromise) {
        throw new Error("Invalid state missing iceServersPromise.")
      }
      const iceServers = await this.iceServersPromise;
      await this.sendSignalingMessage({ type: SignalingMessageType.SETUP_RESPONSE, iceServers: iceServers });
      await this.emitSetupDone(iceServers);
    } catch (e) {
      this.emitError(e);
    }
  }

  /**
   * get a Signaling message and forward it, if it is a WebRTCSignalingMessage
   */
  async handleSignalingMessage(message: SignalingMessage) {
    console.log("signalingMessageHandler", message)
    if (this.state == State.SETUP) {
      if (message.type === SignalingMessageType.SETUP_REQUEST) {
        // This blocks the recv logic but only on this specific signaling channel
        await this.handleDeviceSetupRequest();
      } else {
        throw new Error(`Wrong message type, expected a ${SignalingMessageType.SETUP_REQUEST} but got ${message.type}`);
      }
    } else {
      if (message.type === WebrtcSignalingMessageType.CANDIDATE || message.type === WebrtcSignalingMessageType.DESCRIPTION) {
        const consumers = await this.emit("webrtcsignalingmessage", message);
        if (consumers === 0) {
          console.error(`No webrtcsignaling event listeners registered for the message: ${JSON.stringify(message)}`)
        }
      }
    }
  }

  signalingChannelMessageHandler = async (message: JSONValue) => {
    try {
      console.log("signalingChannelMessageHandler", message)
      const verified = await this.messageSigner.verifyMessage(message);
      const decoded = this.messageEncoder.decodeMessage(verified);

      await this.handleSignalingMessage(decoded);
    } catch (e) {
      await this.emitError(e);
    }
  }

  async emitError(error: unknown) {
    if (error instanceof Error) {
      this.emit("error", error);
    } else {
      this.emit("error", (new Error(JSON.stringify(error))))
    }
  }

  async emitSetupDone(iceServers?: RTCIceServer[]) {
    this.state = State.SIGNALING;
    const consumers = await this.emit("setupdone", iceServers);
    if (consumers === 0) {
      console.error(`No handlers is registered for setupdone, discarding the event.`);
    }
  }

  async sendWebRTCSignalingMessage(message: WebrtcSignalingMessage): Promise < void> {
    return this.sendSignalingMessage(message);
  }

  private async sendSignalingMessage(message: SignalingMessage): Promise<void> {
    const encoded = this.messageEncoder.encodeMessage(message);
    const signed = await this.messageSigner.signMessage(encoded);
    console.log(`sending signaling message ${JSON.stringify(message)}, encoded: ${JSON.stringify(encoded)}, signed: ${JSON.stringify(signed)}`)
    return this.channel.sendMessage(signed);
  }

  /**
   * In Nabto WebRTC the device is always the polite peer when doing perfect
   * negotiation.
   */
  get mode() : MessageTransportMode {
    return MessageTransportMode.DEVICE;
  }
}
