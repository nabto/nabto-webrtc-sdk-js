import { SignalingChannelImpl } from "./impl/SignalingChannelImpl";

export interface SignalingChannel {
  hello(): void;
}

export function createSignalingChannel(channelId: string): SignalingChannel
{
  return new SignalingChannelImpl(channelId);
}
