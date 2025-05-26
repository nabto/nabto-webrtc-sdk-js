import { test, assert } from 'vitest'
import { DefaultMessageEncoder, SignalingMessageType } from './DefaultMessageEncoder'
import { WebrtcSignalingMessageType } from '../MessageTransport';

test('Decode candidate with null', () => {
  const candidate = { "type": "CANDIDATE", "candidate": { "candidate": "candidate: 4226806669 1 udp 2122260223 192.168.0.133 56390 typ host generation 0 ufrag 8gal network - id 1 network - cost 50", "sdpMLineIndex": 0, "sdpMid": "0", "usernameFragment": null } };
  const e = new DefaultMessageEncoder();
  const decodedCandidate = e.decodeMessage(candidate);
  assert(decodedCandidate.type, "CANDIDATE");
  // redundant if statement to make typechecker happy
  if (decodedCandidate.type === "CANDIDATE") {
    assert(decodedCandidate.candidate)
    assert(decodedCandidate.candidate?.sdpMid, "0")
  }
})

test('Decode candidate witnout sdpmid', () => {
  const candidate = { "type": "CANDIDATE", "candidate": { "candidate": "candidate: 4226806669 1 udp 2122260223 192.168.0.133 56390 typ host generation 0 ufrag 8gal network - id 1 network - cost 50", "sdpMLineIndex": 0, "usernameFragment": null } };
  const e = new DefaultMessageEncoder();
  e.decodeMessage(candidate);
})

test('Decode candidate with only a candidate', () => {
  const candidate = { "type": "CANDIDATE", "candidate": { "candidate": "candidate: 4226806669 1 udp 2122260223 192.168.0.133 56390 typ host generation 0 ufrag 8gal network - id 1 network - cost 50" } };
  const e = new DefaultMessageEncoder();
  e.decodeMessage(candidate);
})

test('Decode message.candidate.candidate is non optional', () => {
  const candidate = { "type": "CANDIDATE", "candidate": { } };
  const e = new DefaultMessageEncoder();
  assert.throws(() => e.decodeMessage(candidate), Error);
})

test('Encode candidate', () => {
  const e = new DefaultMessageEncoder()
  const encoded = e.encodeMessage({
    type: WebrtcSignalingMessageType.CANDIDATE,
    candidate: {
      candidate: "string",
      sdpMid: "string",
      sdpMLineIndex: 42,
      usernameFragment: "string"
    }
  });
  assert.equal(JSON.stringify(encoded), JSON.stringify({"type":"CANDIDATE","candidate":{"candidate":"string","sdpMid":"string","sdpMLineIndex":42,"usernameFragment":"string"}}))
})

test('single iceserver urls is encoded as an array', () => {
  const e = new DefaultMessageEncoder()
  const encoded = e.encodeMessage({
    type: SignalingMessageType.SETUP_RESPONSE,
    iceServers: [
      {
        urls: "stun:example.com",
      }
    ]
  });
  assert.equal(JSON.stringify(encoded), JSON.stringify({"type":"SETUP_RESPONSE","iceServers":[{"urls":["stun:example.com"]}]}))
})

// test('Encode Ice Servers', () => {
//   const e = new DefaultMessageEncoder()
//   const encoded = e.encodeMessage({
//     iceServers: [
//       {
//         urls: ["", ""],
//         credential: "",
//         username: ""
//       }
//     ]
//   });
//   assert.equal(encoded, "{\"type\":\"ICE_SERVERS\",\"iceServers\":[{\"urls\":[\"\",\"\"],\"credential\":\"\",\"username\":\"\"}]}")
// })
