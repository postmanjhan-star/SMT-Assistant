import { FeedMaterialTypeEnum, PanasonicMounterItemStatRead } from "@/client"
import { PostProductionFeedContext } from "@/application/post-production-feed/PostProductionFeedContext"
import { PostProductionFeedUseCase } from "@/application/post-production-feed/PostProductionFeedUseCase"
import { RowModelBase } from "@/application/post-production-feed/PostProductionFeedTypes"
import { PostProductionFeedGridAdapter } from "@/ui/post-production/PostProductionFeedGridAdapter"
import { createPinia, setActivePinia } from "pinia"
import { usePostProductionFeedStore } from "@/stores/postProductionFeedStore"
import type { PostProductionFeedStrategy } from "@/application/post-production-feed/PostProductionFeedStrategy"

describe("PostProductionFeedUseCase", () => {
    it("does not call inspectionUpload in testing mode", async () => {
        const mockGridApi = {
            getRowNode: vi.fn().mockReturnValue({ setDataValue: vi.fn(), setSelected: vi.fn() }),
            forEachNode: vi.fn(),
            applyTransaction: vi.fn(),
        }

        const rows: RowModelBase[] = [
            { slotIdno: "10008", subSlotIdno: "L", appendedMaterialInventoryIdno: "" },
        ]

        const grid = new PostProductionFeedGridAdapter<RowModelBase>(
            () => mockGridApi as any,
            () => rows
        )

        const stat = {
            id: 1,
            slot_idno: "10008",
            sub_slot_idno: "L",
            feed_records: [
                {
                    feed_material_pack_type:
                        FeedMaterialTypeEnum.IMPORTED_MATERIAL_PACK,
                    material_pack_code: "B4909892",
                },
            ],
        } as PanasonicMounterItemStatRead

        setActivePinia(createPinia())
        const store = usePostProductionFeedStore()
        store.bindGrid(grid)
        store.bindUi({
            success: vi.fn().mockResolvedValue(undefined),
            warn: vi.fn(),
            error: vi.fn().mockResolvedValue(undefined),
            notifyError: vi.fn(),
            playErrorTone: vi.fn().mockResolvedValue(undefined),
            resetSlotMaterialFormInputs: vi.fn(),
        })

        const deps = {
            store,
            getMounterData: () => [stat],
            isTestingMode: () => true,
            isProductionStarted: () => true,
            resetMaterialScan: vi.fn(),
            inspectionUpload: vi.fn().mockResolvedValue(undefined),
            appendedMaterialUpload: vi.fn().mockResolvedValue(undefined),
        }

        const strategy: PostProductionFeedStrategy = {
            submit: vi.fn().mockResolvedValue(true),
        }

        const useCase = new PostProductionFeedUseCase<RowModelBase>(
            deps,
            () => strategy
        )

        const ctx: PostProductionFeedContext = {
            slot: "10008",
            subSlot: "L",
            slotIdno: "10008-L",
            result: {
                success: true,
                materialInventory: { idno: "B4909892" },
                matchedRows: [{ slotIdno: "10008", subSlotIdno: "L" }],
            },
        }

        await useCase.execute(ctx)

        expect(deps.inspectionUpload).not.toHaveBeenCalled()
    })
})
