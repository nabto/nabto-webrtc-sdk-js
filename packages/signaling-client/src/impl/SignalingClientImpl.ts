import { SignalingChannel, createSignalingChannel } from "signaling-base";
import { SignalingClient } from "../SignalingClient";

export class SignalingClientImpl implements SignalingClient {

  chan: SignalingChannel = createSignalingChannel("foobar");

  clientHello(): void {
    this.chan.hello();
    console.log("Also hello");
  }
}
