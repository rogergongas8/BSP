/**
 * Renders schema.org structured data for search and answer engines.
 *
 * This is the one deliberate use of `dangerouslySetInnerHTML` in the codebase, and the reason it
 * is safe: React escapes text children (quotes become &quot;), which corrupts JSON inside a
 * <script>, so inline JSON-LD can only be emitted raw. The input is a static object built on the
 * server from constants (never user content), and every "<" is escaped so the payload cannot
 * close the script tag. Browsers never execute application/ld+json, so CSP is unaffected.
 */
type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue }

export default function JsonLd({ data }: { data: { readonly [key: string]: JsonValue } }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
