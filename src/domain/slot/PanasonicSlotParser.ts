export type ParsedPanasonicSlot = {
  slot: string
  subSlot: string
}

export function parsePanasonicSlotIdno(raw: string): ParsedPanasonicSlot | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const parts = trimmed.split('-')
  if (parts.length === 1) {
    return { slot: parts[0], subSlot: '' }
  }

  if (parts.length === 2) {
    return { slot: parts[0], subSlot: parts[1] }
  }

  return null
}
