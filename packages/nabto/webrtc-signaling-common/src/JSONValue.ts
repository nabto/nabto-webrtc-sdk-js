// Definition of a JSON Value. This is used for APIs which exchanges JSON data.

import { z } from 'zod'
const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type JSONLiteral = z.infer<typeof literalSchema>;
export type JSONValue = JSONLiteral | { [key: string]: JSONValue } | JSONValue[];

// in zod v4 there is a json type.

export const JSONValueSchema: z.ZodType<JSONValue> = z.lazy(() =>
  z.union([literalSchema, z.array(JSONValueSchema), z.record(JSONValueSchema)])
);
