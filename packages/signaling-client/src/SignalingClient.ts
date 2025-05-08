import { SignalingClientImpl } from "./impl/SignalingClientImpl";

export interface SignalingClient {
  clientHello(): void;
}

export function createSignalingClient(): SignalingClient
{
  return new SignalingClientImpl();
}
