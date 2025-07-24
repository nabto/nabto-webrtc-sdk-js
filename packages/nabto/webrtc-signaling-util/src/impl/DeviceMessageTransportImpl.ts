import { JSONValue, SignalingChannel, SignalingError, SignalingErrorCodes, TypedEventEmitter } from "@nabto/webrtc-signaling-common";
import { SignalingDevice } from "@nabto/webrtc-signaling-device";
import { DefaultMessageEncoder, SignalingMessage } from "./DefaultMessageEncoder";
import { MessageSigner } from "./MessageSigner";
import { NoneMessageSigner } from "./NoneMessageSigner";
import { JWTMessageSigner } from "./JWTMessageSigner";
import { MessageTransport, MessageTransportMode, WebrtcSignalingMessageType, WebrtcSignalingMessage } from "../MessageTransport";
import { SignalingMessageType } from "./DefaultMessageEncoder";
import { DeviceMessageTransportOptions, DeviceMessageTransportSecurityMode } from "../DeviceMessageTransport";

enum State {
  WAIT_FIRST_MESSAGE, // The implementation is waiting on receiving the first message.
  SETUP, // if we are exchanging SETUP_REQUEST/RESPONSE and aquiring ice servers.
  SIGNALING
}

interface DeviceMessageTransportImplEventHandlers {
  webrtcsignalingmessage: (message: WebrtcSignalingMessage) => Promise<void>;
  error: (error: unknown) => void;
  setupdone: (iceServers?: RTCIceServer[]) => Promise<void>;
}

const logModule = "Device Message Transport";

export class DeviceMessageTransportImpl extends TypedEventEmitter<DeviceMessageTransportImplEventHandlers> implements MessageTransport {

  messageEncoder: DefaultMessageEncoder = new DefaultMessageEncoder();
  state: State = State.WAIT_FIRST_MESSAGE;
  messageSigner?: MessageSigner;

  constructor(private device: SignalingDevice, private channel: SignalingChannel, private options: DeviceMessageTransportOptions) {
    super();
    this.channel.on("message", async (message: JSONValue) => { this.signalingChannelMessageHandler(message) });
  }

  static create(device: SignalingDevice, channel: SignalingChannel, options: DeviceMessageTransportOptions) {
    const instance = new DeviceMessageTransportImpl(device, channel, options);
    return instance;
  }


  async handleDeviceSetupRequest() {
    try {
      const iceServers = await this.device.requestIceServers();
      await this.sendSignalingMessage({ type: SignalingMessageType.SETUP_RESPONSE, iceServers: iceServers });
      await this.emitSetupDone(iceServers);
    } catch (e) {
      this.emitError(e);
    }
  }

  /**
   * get a Signaling message and forward it, if it is a WebrtcSignalingMessage
   */
  async handleSignalingMessage(message: SignalingMessage) {
    if (this.state == State.SETUP) {
      if (message.type === SignalingMessageType.SETUP_REQUEST) {
        console.debug(`${logModule}: Received a (SETUP_REQUEST) message.`, message);
        // This blocks the recv logic but only on this specific signaling channel
        await this.handleDeviceSetupRequest();
      } else {
        throw new SignalingError(SignalingErrorCodes.DECODE_ERROR, `Wrong message type, expected a ${SignalingMessageType.SETUP_REQUEST} but got ${message.type}`);
      }
    } else {
      console.debug(`${logModule}: Received a message of type (${message.type}) and forwards it to the application.`, message);
      if (message.type === WebrtcSignalingMessageType.CANDIDATE || message.type === WebrtcSignalingMessageType.DESCRIPTION) {
        const consumers = await this.emit("webrtcsignalingmessage", message);
        if (consumers === 0) {
          console.error(`No webrtcsignaling event listeners registered for the message: ${JSON.stringify(message)}`);
        }
      }
    }
  }

  async setupMessageSigner(message: JSONValue): Promise<void> {
    if (this.options.securityMode === DeviceMessageTransportSecurityMode.NONE) {
      this.messageSigner = new NoneMessageSigner();
    } else if (this.options.securityMode === DeviceMessageTransportSecurityMode.SHARED_SECRET) {
      const keyId = await JWTMessageSigner.getKeyId(message);
      const sharedSecret = await this.options.sharedSecretCallback(keyId);
      this.messageSigner = new JWTMessageSigner(sharedSecret, keyId);
    } else {
      throw new SignalingError(SignalingErrorCodes.INTERNAL_ERROR, "Unknown security mode.")
    }
  }

  signalingChannelMessageHandler = async (message: JSONValue) => {
    try {
      if (this.state === State.WAIT_FIRST_MESSAGE) {
        await this.setupMessageSigner(message);
        this.state = State.SETUP;
      }
      if (!this.messageSigner) {
        throw new Error("This should never happen. As the message signer is setup in the FIRST_MESSAGE state.")
      }
      const verified = await this.messageSigner.verifyMessage(message);
      const decoded = this.messageEncoder.decodeMessage(verified);

      await this.handleSignalingMessage(decoded);
    } catch (e) {
      await this.emitError(e);
    }
  }

  async emitError(error: unknown) {
    this.channel.sendError(SignalingError.fromUnknown(error));
    this.emitSync("error", error);
  }

  async emitSetupDone(iceServers?: RTCIceServer[]) {
    this.state = State.SIGNALING;
    const consumers = await this.emit("setupdone", iceServers);
    if (consumers === 0) {
      console.error(`No handlers is registered for setupdone, discarding the event.`);
    }
  }

  async sendWebrtcSignalingMessage(message: WebrtcSignalingMessage): Promise<void> {
    if (this.state !== State.SIGNALING) {
      throw new Error("Trying to send a signaling message before setup has completed.");
    }
    return this.sendSignalingMessage(message);
  }

  private async sendSignalingMessage(message: SignalingMessage): Promise<void> {
    if (!this.messageSigner) {
      throw new Error("Never here, the message signer is configured when we are sending messages.");
    }
    const encoded = this.messageEncoder.encodeMessage(message);
    const signed = await this.messageSigner.signMessage(encoded);
    console.debug(`${logModule}: Sending a message of type (${message.type}) to the remote peer.`, message);
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
