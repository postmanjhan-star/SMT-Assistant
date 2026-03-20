import { ref } from "vue"
import { useMaterialQueryState } from "@/ui/shared/composables/useMaterialQueryState"

describe("useMaterialQueryState", () => {
  it("load calls loader with normalized uuid and updates rowData", async () => {
    const uuid = ref("  abc-123  ")
    const mockData = [{ id: 1 }, { id: 2 }]
    const loader = vi.fn().mockResolvedValue(mockData)

    const { rowData, load } = useMaterialQueryState(uuid, loader)

    expect(rowData.value).toEqual([])

    const result = await load()

    expect(loader).toHaveBeenCalledWith("abc-123")
    expect(rowData.value).toEqual(mockData)
    expect(result).toEqual(mockData)
  })

  it("load does not call loader when uuid is empty and returns current rowData", async () => {
    const uuid = ref("")
    const loader = vi.fn()

    const { rowData, load } = useMaterialQueryState(uuid, loader)

    const result = await load()

    expect(loader).not.toHaveBeenCalled()
    expect(result).toEqual([])
    expect(rowData.value).toEqual([])
  })
})
