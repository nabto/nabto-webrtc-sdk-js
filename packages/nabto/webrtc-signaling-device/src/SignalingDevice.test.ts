import { test, expect } from 'vitest'
import { createSignalingDevice } from './SignalingDevice'
import { SignalingDeviceImpl } from './impl/SignalingDeviceImpl'

test('Create and destroy signaling device', () => {
  for (let i = 0; i < 10; i++) {
    createSignalingDevice({ endpointUrl: "http://localhost:3000", productId: "wp-test", deviceId: "wd-test", tokenGenerator: async () => { return ""} });
  }
})

test('Create and destroy signaling device default url', () => {
  createSignalingDevice({ productId: "wp-test", deviceId: "wd-test", tokenGenerator: async () => { return ""} });
})

test('SignalingDevice converts productId to lowercase', () => {
  const options = {
    endpointUrl: "http://localhost:3000",
    productId: "WP-TEST",
    deviceId: "wd-test",
    tokenGenerator: async () => { return ""; }
  };

  new SignalingDeviceImpl(options);

  expect(options.productId).toBe("wp-test");
})

test('SignalingDevice converts deviceId to lowercase', () => {
  const options = {
    endpointUrl: "http://localhost:3000",
    productId: "wp-test",
    deviceId: "WD-TEST",
    tokenGenerator: async () => { return ""; }
  };

  new SignalingDeviceImpl(options);

  expect(options.deviceId).toBe("wd-test");
})

test('SignalingDevice converts both productId and deviceId to lowercase', () => {
  const options = {
    endpointUrl: "http://localhost:3000",
    productId: "WP-MIXED-Case",
    deviceId: "WD-MIXED-Case",
    tokenGenerator: async () => { return ""; }
  };

  new SignalingDeviceImpl(options);

  expect(options.productId).toBe("wp-mixed-case");
  expect(options.deviceId).toBe("wd-mixed-case");
})

test('SignalingDevice handles already lowercase IDs', () => {
  const options = {
    endpointUrl: "http://localhost:3000",
    productId: "wp-already-lower",
    deviceId: "wd-already-lower",
    tokenGenerator: async () => { return ""; }
  };

  new SignalingDeviceImpl(options);

  expect(options.productId).toBe("wp-already-lower");
  expect(options.deviceId).toBe("wd-already-lower");
})
