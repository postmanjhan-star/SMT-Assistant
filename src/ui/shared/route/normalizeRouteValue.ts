export function normalizeRouteValue(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? "").trim()
  return String(value ?? "").trim()
}
