
export interface SignalingEventHandlerConnection {
  checkAlive(): void;
  on(target: "connectionreconnect", f: () => void): void;
};


/**
 * The purpose of this component is to handle signaling events such as signaling
 * reconnects. And react to RTCPeerConnection events which needs to trigger
 * signaling actions such as checkAlive and restartIce.
 */
export class SignalingEventHandler {
  constructor(private pc: RTCPeerConnection, private connection: SignalingEventHandlerConnection) {
    pc.addEventListener("connectionstatechange", () => {
      if (this.pc.connectionState === "disconnected") {
        this.connection.checkAlive()
      }
      if (this.pc.connectionState === "failed") {
        this.pc.restartIce();
      }
    })
    connection.on("connectionreconnect", () => {
      this.pc.restartIce();
    })
  }
}
