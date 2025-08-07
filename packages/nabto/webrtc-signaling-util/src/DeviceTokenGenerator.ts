import * as rs from "jsrsasign";

/**
 * Utility class used to generate tokens for Cameras to connect to the Sigaling service.
 */
export class DeviceTokenGenerator {

  /**
   * Construct a token generator for a camera.
   *
   * @param productId Product ID of the device
   * @param deviceId Device ID of the device
   * @param privateKey Private key in PEM format
   */
  constructor(private productId: string, private deviceId: string, private privateKey: string) {
  }

  private async getKeyId(pk: string): Promise<string> {
    const key = rs.KEYUTIL.getKeyFromPlainPrivatePKCS8PEM(pk);
    const spki = new rs.KJUR.asn1.x509.SubjectPublicKeyInfo(key);
    const md = new rs.KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" })
    md.updateHex(spki.tohex())
    const digest = md.digest()
    return `device:${digest}`
  }

  /**
   * Generate a JWT for the camera to use when connecting to the signaling service.
   *
   * @returns The resulting JWT
   */
  async generateToken(): Promise<string> {
    let keyId;
    try {
      keyId = await this.getKeyId(this.privateKey);
    } catch (e) {
      throw new Error("Invalid Private Key provided for token generation");
    }
    const resource = `urn:nabto:webrtc:${this.productId}:${this.deviceId}`

     const key = rs.KEYUTIL.getKeyFromPlainPrivatePKCS8PEM(this.privateKey);
    const header = { alg: "ES256", typ: "JWT", kid: keyId };
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const payload: Record<string, any> = {};
    const now = rs.KJUR.jws.IntDate.get("now");
    const end = rs.KJUR.jws.IntDate.get("now + 1day");
    payload.nbf = now;
    payload.iat = now;
    payload.exp = end;
    payload.scope = "device:connect turn"
    payload.resource = resource
    const jwt = rs.KJUR.jws.JWS.sign("ES256", JSON.stringify(header), JSON.stringify(payload), key)
    return jwt;
  }
}
