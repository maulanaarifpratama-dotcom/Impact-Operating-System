import type { Json } from './database.generated';

/**
 * Bridges our domain objects and Supabase's `Json` column type.
 *
 * The generated types declare `jsonb` columns as `Json`, a recursive union that
 * an ordinary `interface` is not assignable to: TypeScript requires an index
 * signature to prove every property is JSON-shaped, and adding one to a domain
 * type would let any key through and lose the checking we want everywhere else.
 *
 * So the conversion is admitted here rather than left as a red squiggle at every
 * write. These are casts, not validation — they say "this value is JSON data",
 * which holds because these payloads are plain objects, arrays, strings and
 * numbers already. Anything holding a Date, Map, Set, class instance or
 * `undefined` value will serialise differently than its type suggests, so do not
 * reach for this to silence an error about one of those.
 */

/** Domain value -> `jsonb` column, for inserts and updates. */
export function toJson<T>(value: T): Json {
  return value as unknown as Json;
}

/**
 * `jsonb` column -> an expected shape, for reads.
 *
 * Unchecked: nothing verifies the row matches `T`. Prefer optional access on the
 * result (`fromJson<X>(col)?.field`) so a row written by an older version does
 * not throw.
 */
export function fromJson<T>(value: Json | null | undefined): T | undefined {
  if (value === null || value === undefined) return undefined;
  return value as unknown as T;
}
