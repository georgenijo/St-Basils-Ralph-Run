type ImportOriginal = <T = Record<string, unknown>>() => Promise<T>

/** Retain component exports when rendering a server component that imports a client module. */
export async function mockClientModule(importOriginal: ImportOriginal, names: readonly string[]) {
  const original = await importOriginal<Record<string, unknown>>()
  return Object.fromEntries(names.map((name) => [name, original[name]]))
}
