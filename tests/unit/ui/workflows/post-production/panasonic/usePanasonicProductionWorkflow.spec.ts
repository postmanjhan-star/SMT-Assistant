import { describe, expect, it } from "vitest"
import { ProduceTypeEnum } from "@/client"
import { mapTestingModeToProduceType } from "@/ui/workflows/post-production/panasonic/composables/usePanasonicProductionWorkflow"

describe("mapTestingModeToProduceType", () => {
  it("maps formal mode to NORMAL_PRODUCE_MODE", () => {
    expect(mapTestingModeToProduceType(false)).toBe(
      ProduceTypeEnum.NORMAL_PRODUCE_MODE
    )
  })

  it("maps testing mode to TESTING_PRODUCE_MODE", () => {
    expect(mapTestingModeToProduceType(true)).toBe(
      ProduceTypeEnum.TESTING_PRODUCE_MODE
    )
  })

  it("keeps null as null", () => {
    expect(mapTestingModeToProduceType(null)).toBeNull()
  })
})
