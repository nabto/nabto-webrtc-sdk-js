import { test, expect } from 'vitest'
import { createSignalingClient } from './SignalingClient'
import { SignalingClientImpl } from './impl/SignalingClientImpl'

test('Create and destroy signaling client', () => {
  for (let i = 0; i < 10; i++) {
    createSignalingClient({ endpointUrl: "http://localhost:3000", productId: "wp-test", deviceId: "wd-test" });
  }
})

test('Create and destroy signaling client default url', () => {
  createSignalingClient({ productId: "wp-test", deviceId: "wd-test" });
})

test('SignalingClient converts productId to lowercase', () => {
  const options = {
    endpointUrl: "http://localhost:3000",
    productId: "WP-TEST",
    deviceId: "wd-test"
  };

  new SignalingClientImpl(options);

  expect(options.productId).toBe("wp-test");
})

test('SignalingClient converts deviceId to lowercase', () => {
  const options = {
    endpointUrl: "http://localhost:3000",
    productId: "wp-test",
    deviceId: "WD-TEST"
  };

  new SignalingClientImpl(options);

  expect(options.deviceId).toBe("wd-test");
})

test('SignalingClient converts both productId and deviceId to lowercase', () => {
  const options = {
    endpointUrl: "http://localhost:3000",
    productId: "WP-MIXED-Case",
    deviceId: "WD-MIXED-Case"
  };

  new SignalingClientImpl(options);

  expect(options.productId).toBe("wp-mixed-case");
  expect(options.deviceId).toBe("wd-mixed-case");
})

test('SignalingClient handles already lowercase IDs', () => {
  const options = {
    endpointUrl: "http://localhost:3000",
    productId: "wp-already-lower",
    deviceId: "wd-already-lower"
  };

  new SignalingClientImpl(options);

  expect(options.productId).toBe("wp-already-lower");
  expect(options.deviceId).toBe("wd-already-lower");
})
