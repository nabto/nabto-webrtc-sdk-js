# React Web Demo

This directory consists of a Web demo written in TypeScript + React.
The purpose of the demo is to showcase how a WebRTC Client and device can be
constructed.

This demo is published to github pages.

## Usage

Once you have run install and build on the monorepo using pnpm, you can run a live developer view of the demo using the following command

```
pnpm run dev
```

## URL Params

When linking to the url you may use URL search params and fragment identifier to encode the initial settings that will populate the demo. The following params are available

```typescript
interface UrlParams {
  productId: string
  deviceId: string
  sharedSecret: string
  privateKey: string
  clientAccessToken: string
  endpoint: string
  mode: 'client' | 'device'
  openVideoStream: boolean
  openAudioStream: boolean
  requireCentralAuth: boolean
}
```

Note that privateKey should always be sent in the fragment identifier and since it is PEM encoded y ou must run a URL encoding pass on it before adding it to the  URL. Encoding text to URL can be done with a library or with https://www.urlencoder.org/

Similarly, other params may need to be URL-encoded depending on their contents.

Example URL string:

```
?mode=device&productId=wp-xxxx&deviceId=wd-xxxx&sharedSecret=mysecret#privateKey=-----BEGIN PRIVATE KEY-----%0Ablahblah%0A-----END PRIVATE KEY-----
```
