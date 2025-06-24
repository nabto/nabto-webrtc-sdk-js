import { MessageTransport, MessageTransportMode, WebrtcSignalingMessageType, WebrtcSignalingMessage } from "./MessageTransport";

/**
 * This component implements perfect negotiation.
 *
 * The implementation strictly follows the mozilla description of
 * the algorithm.
 * https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
 */
export class PerfectNegotiation {

  makingOffer: boolean = false;
  ignoreOffer: boolean = false;
  polite: boolean;

  constructor(private pc: RTCPeerConnection, private messageTransport: MessageTransport) {
    pc.addEventListener("negotiationneeded", () => {
      this.onnegotiationneeded();
    })
    pc.addEventListener("icecandidate", (ev: RTCPeerConnectionIceEvent) => {
      this.onicecandidate(ev);
    })
    pc.addEventListener("iceconnectionstatechange", () => {
      this.oniceconnectionstatechange();
    })
    messageTransport.on("webrtcsignalingmessage", async (message: WebrtcSignalingMessage) => {
      if (message.type === WebrtcSignalingMessageType.CANDIDATE) {
        this.handleCandidate(message.candidate);
      } else if (message.type == WebrtcSignalingMessageType.DESCRIPTION) {
        this.handleDescription(message.description);
      }
    })
    this.polite = messageTransport.mode === MessageTransportMode.DEVICE;
  }

  async onnegotiationneeded() {
    try {
      this.makingOffer = true;
      await this.pc.setLocalDescription();
      const description = this.pc.localDescription;
      this.sendDescription(description);
    } catch (err) {
      console.error(err);
    } finally {
      this.makingOffer = false;
    }
  };

  onicecandidate(candidate?: RTCPeerConnectionIceEvent) {
    if (candidate) {
      this.sendCandidate(candidate.candidate);
    }
  }


  oniceconnectionstatechange() {
    if (this.pc.iceConnectionState === "failed") {
      this.pc.restartIce();
    }
  };

  async sendDescription(description: RTCSessionDescription | null) {
    if (description) {
      this.messageTransport.sendWebrtcSignalingMessage({ type: WebrtcSignalingMessageType.DESCRIPTION, description: description });
    }
  }

  async sendCandidate(candidate: RTCIceCandidate | null) {
    if (candidate) {
      this.messageTransport.sendWebrtcSignalingMessage({ type: WebrtcSignalingMessageType.CANDIDATE, candidate: candidate });
    }
  }

  async handleDescription(description: RTCSessionDescriptionInit) {
    try {
      const offerCollision =
                description.type === "offer" &&
                (this.makingOffer || this.pc.signalingState !== "stable");

      this.ignoreOffer = !this.polite && offerCollision;
      if (this.ignoreOffer) {
        return;
      }

      await this.pc.setRemoteDescription(description);
      if (description.type === "offer") {
        await this.pc.setLocalDescription();
        const localDescription = this.pc.localDescription
        await this.sendDescription(localDescription);
      }
    } catch (err) {
      console.error(err);
    }
  }
  async handleCandidate(candidate: RTCIceCandidateInit) {
    try {
      try {
        await this.pc.addIceCandidate(candidate);
      } catch (err) {
        if (!this.ignoreOffer) {
          throw err;
        }
      }
    } catch (err) {
      console.error(err);
    }
  }
}
