import { SlotSubmitContext } from '@/application/slot-submit/SlotSubmitContext';

export interface SlotSubmitStrategy {
    submit(ctx: SlotSubmitContext): Promise<boolean>;
}