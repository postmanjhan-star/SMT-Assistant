import { formatSlotId } from "@/domain/production/PostProductionFeedRules"
import { PostProductionFeedContext } from "./PostProductionFeedContext"
import { PostProductionFeedDeps } from "./PostProductionFeedDeps"

export interface PostProductionFeedStrategy {
    submit(ctx: PostProductionFeedContext): Promise<boolean>
}

export abstract class PostProductionFeedStrategyBase
    implements PostProductionFeedStrategy
{
    constructor(protected deps: PostProductionFeedDeps) {}

    abstract submit(ctx: PostProductionFeedContext): Promise<boolean>

    protected async handleMistmatch(
        inputSlot: string,
        inputSubSlot: string,
        materialRowId: string
    ) {
        const inputSlotIdno = formatSlotId({
            slotIdno: inputSlot,
            subSlotIdno: inputSubSlot,
        })

        this.deps.store.deselectRow(materialRowId)

        await this.deps.ui.playErrorTone()
        this.deps.ui.notifyError(`錯誤的槽位 ${inputSlotIdno}`)
        this.deps.ui.resetSlotMaterialFormInputs()
    }
}
