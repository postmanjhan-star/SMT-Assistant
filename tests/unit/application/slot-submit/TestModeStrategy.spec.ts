import { TestingModeStrategy } from '@/application/slot-submit/TestingModeStrategy';
import { SlotSubmitDeps } from '@/application/slot-submit/SlotSubmitDeps';
import { SlotSubmitContext } from '@/application/slot-submit/SlotSubmitContext';
import { SlotSubmitFeedGridAdapter } from '@/ui/slot-submit/SlotSubmitFeedGridAdapter';
import { TESTING_FORCE_BIND_REMARK } from '@/domain/slot/SlotBindingRules';
import { createPinia, setActivePinia } from 'pinia';
import { useSlotSubmitStore } from '@/stores/slotSubmitStore';

describe('TestingModeStrategy', () => {
    let strategy: TestingModeStrategy;
    let mockGridApi: any;
    let deps: SlotSubmitDeps;
    let store: ReturnType<typeof useSlotSubmitStore>;
    let materialGrid: SlotSubmitFeedGridAdapter;
    let mockResetInputs: any;

    beforeEach(() => {
        setActivePinia(createPinia());
        store = useSlotSubmitStore();
        store.setTestingMode(true);

        mockGridApi = {
            getRowNode: vi.fn(),
        };
        mockResetInputs = vi.fn();

        materialGrid = new SlotSubmitFeedGridAdapter(mockGridApi);
        vi.spyOn(materialGrid, 'cleanErrorMaterialInventory').mockImplementation(() => {});

        store.bindDeps({
            grid: materialGrid,
            resetInputs: mockResetInputs,
        });

        deps = { store };

        strategy = new TestingModeStrategy(deps);
    });

    it('should force bind if no match found in Testing Mode (??????)', async () => {
        vi.spyOn(materialGrid, 'hasRow').mockReturnValue(true);
        vi.spyOn(materialGrid, 'applyWarningBinding').mockReturnValue(true);

        const ctx: SlotSubmitContext = {
            result: {
                success: true,
                materialInventory: { idno: 'MAT123' } as any,
                matchedRows: [] // 無匹配資料
            },
            slot: 'A',
            subSlot: '1',
            slotIdno: 'A-1'
        };

        const result = await strategy.submit(ctx);

        expect(result).toBe(true);
        // 驗證是否標記為 warning 且備註為廠商測試新料
        expect(materialGrid.applyWarningBinding).toHaveBeenCalledWith('A-1', 'MAT123', TESTING_FORCE_BIND_REMARK);
        expect(store.lastResult?.message).toContain(TESTING_FORCE_BIND_REMARK);
        expect(mockResetInputs).toHaveBeenCalled();
    });
});
