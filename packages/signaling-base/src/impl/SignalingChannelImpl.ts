import { SignalingChannel } from "../SignalingChannel";


export class SignalingChannelImpl implements SignalingChannel {
  constructor(private channelId: string) {};
  hello(): void {
    console.log("Channel Hello: ", this.channelId);
  }
}
