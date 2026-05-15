// Tightens TypeScript's built-in lib types:
//   - JSON.parse() returns unknown instead of any
//   - Array.filter(Boolean) infers non-nullable element type
//   - Array.includes() accepts wider input types
//   - fetch() returns a typed Response
// See: https://www.totaltypescript.com/ts-reset
import "@total-typescript/ts-reset";
