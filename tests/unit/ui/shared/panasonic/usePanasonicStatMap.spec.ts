import { ref } from "vue"
import { usePanasonicStatMap } from "@/ui/shared/composables/panasonic/usePanasonicStatMap"

describe("usePanasonicStatMap", () => {
  const parseSlotIdno = (raw: string) => {
    const normalized = raw.trim()
    if (!normalized) return null

    const [slot, subSlot = ""] = normalized.split("-")
    if (!slot) return null

    return {
      slot,
      subSlot,
    }
  }

  it("finds stat by exact slot-subslot key", () => {
    const items = ref([
      { id: 11, slot_idno: "10008", sub_slot_idno: "L" },
      { id: 12, slot_idno: "10009", sub_slot_idno: "R" },
    ])

    const { getStatBySlotIdno } = usePanasonicStatMap({
      getItems: () => items.value,
      parseSlotIdno,
    })

    expect(getStatBySlotIdno("10008-L")).toEqual({ id: 11 })
  })

  it("falls back to base slot key when subslot key is missing", () => {
    const items = ref([{ id: 21, slot_idno: "20001", sub_slot_idno: "" }])

    const { getStatBySlotIdno } = usePanasonicStatMap({
      getItems: () => items.value,
      parseSlotIdno,
    })

    expect(getStatBySlotIdno("20001-L")).toEqual({ id: 21 })
  })

  it("reacts to source item updates", () => {
    const items = ref([{ id: 31, slot_idno: "30001", sub_slot_idno: "L" }])

    const { getStatBySlotIdno } = usePanasonicStatMap({
      getItems: () => items.value,
      parseSlotIdno,
    })

    expect(getStatBySlotIdno("30001-L")).toEqual({ id: 31 })

    items.value = [{ id: 32, slot_idno: "30001", sub_slot_idno: "L" }]

    expect(getStatBySlotIdno("30001-L")).toEqual({ id: 32 })
  })
})
