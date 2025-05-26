import { test } from 'vitest'
import { createSignalingDevice } from './SignalingDevice'

test('Create and destroy signaling device', () => {
  for (let i = 0; i < 10; i++) {
    createSignalingDevice({ endpointUrl: "http://localhost:3000", productId: "wp-test", deviceId: "wd-test", tokenGenerator: async () => { return ""} });
  }
})

test('Create and destroy signaling device default url', () => {
  createSignalingDevice({ productId: "wp-test", deviceId: "wd-test", tokenGenerator: async () => { return ""} });
})
