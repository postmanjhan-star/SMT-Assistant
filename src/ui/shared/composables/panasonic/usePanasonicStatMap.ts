import { computed } from "vue"

export type PanasonicSlotParser = (raw: string) => {
  slot: string
  subSlot: string
} | null

export type PanasonicStatMapItem = {
  id?: number
  slot_idno?: string
  sub_slot_idno?: string | null
}

export type PanasonicStatMapOptions<T extends PanasonicStatMapItem> = {
  getItems: () => T[]
  parseSlotIdno: PanasonicSlotParser
}

function makeSlotKey(slotIdno: string, subSlotIdno?: string | null): string {
  const slot = (slotIdno ?? "").trim()
  const sub = (subSlotIdno ?? "").trim()
  return sub ? `${slot}-${sub}` : slot
}

export function usePanasonicStatMap<T extends PanasonicStatMapItem>(
  options: PanasonicStatMapOptions<T>
) {
  const statMap = computed(() => {
    const map = new Map<string, { id: number }>()
    const items = options.getItems()

    items.forEach((item) => {
      if (!item?.id || !item.slot_idno) return
      const key = makeSlotKey(item.slot_idno, item.sub_slot_idno)
      map.set(key, { id: item.id })
    })

    return map
  })

  function getStatBySlotIdno(slotIdno: string): { id: number } | null {
    const parsed = options.parseSlotIdno(slotIdno.trim())
    if (!parsed) return null

    const key = makeSlotKey(parsed.slot, parsed.subSlot)
    return statMap.value.get(key) ?? statMap.value.get(parsed.slot) ?? null
  }

  return {
    getStatBySlotIdno,
  }
}
