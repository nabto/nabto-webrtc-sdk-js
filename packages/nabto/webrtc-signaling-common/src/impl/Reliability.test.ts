import { test, assert } from 'vitest'
import { ReliabilityMessageSchema } from './Reliability'

test('Safe parse allows extra fields', () => {
  const parsed = ReliabilityMessageSchema.safeParse({ "type": "ACK", "seq": 42, "extra": "moredata" })
  assert(parsed.success);
})
