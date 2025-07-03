import { test, assert, expect } from 'vitest'
import { JWTMessageSigner } from './JWTMessageSigner';

test('Test sign and verify', async () => {
  const sharedSecret = "key";
  const signer1 = new JWTMessageSigner(sharedSecret);
  const signer2 = new JWTMessageSigner(sharedSecret);
  const msg = {
    "foo": "bar"
  }
  const msg2 = {
    "foo": "bar"
  }
  const signed1 = await signer1.signMessage(msg)
  await signer2.verifyMessage(signed1);
  const signed2 = await signer2.signMessage(msg2);
  await signer1.verifyMessage(signed2);
});

test('Test sign twice fails', async () => {
  const sharedSecret = "key";
  const signer1 = new JWTMessageSigner(sharedSecret);
  const msg = {
    "foo": "bar"
  }
  const signed1 = await signer1.signMessage(msg)
  await expect(signer1.signMessage(msg)).rejects.toThrow(
    "Cannot sign the message with sequence number > 1, as we have not yet received a valid message from the remote peer."
  );
});

test('Test that the token has a proper nonce', async () => {
  const sharedSecret = "key";
  const signer1 = new JWTMessageSigner(sharedSecret);
  const msg = {
    "foo": "bar"
  }
  const signed1 = await signer1.signMessage(msg)
  assert(signed1.type === "JWT");
  const parts = signed1.jwt.split(".");
  const claims = JSON.parse(atob(parts[1]));
  const signerNonce = claims.signerNonce;
  const remoteNonce = claims.verifierNonce;
  assert(signerNonce.length > 10)
  assert(remoteNonce === undefined);
});
