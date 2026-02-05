import { TestingModeStrategy } from '@/application/slot-submit/TestingModeStrategy';
import { SlotSubmitDeps } from '@/application/slot-submit/SlotSubmitDeps';
import { SlotSubmitContext } from '@/application/slot-submit/SlotSubmitContext';
import { SlotSubmitFeedGridAdapter } from '@/ui/slot-submit/SlotSubmitFeedGridAdapter';
import { TESTING_FORCE_BIND_REMARK } from '@/domain/slot/SlotBindingRules';

describe('TestingModeStrategy', () => {
    let strategy: TestingModeStrategy;
    let mockGridApi: any;
    let mockUi: any;
    let deps: SlotSubmitDeps;

    beforeEach(() => {
        mockGridApi = {
            getRowNode: vi.fn(),
        };
        mockUi = {
            success: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        };

        const materialGrid = new SlotSubmitFeedGridAdapter(mockGridApi);
        vi.spyOn(materialGrid, 'cleanErrorMaterialInventory').mockImplementation(() => {});

        deps = {
            grid: materialGrid,
            ui: mockUi,
            isTestingMode: true,
            autoUpload: vi.fn(),
            resetInputs: vi.fn(),
        };

        strategy = new TestingModeStrategy(deps);
    });

    it('should force bind if no match found in Testing Mode (??????)', async () => {
        vi.spyOn(deps.grid, 'hasRow').mockReturnValue(true);
        vi.spyOn(deps.grid, 'applyWarningBinding').mockReturnValue(true);

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
        expect(deps.grid.applyWarningBinding).toHaveBeenCalledWith('A-1', 'MAT123', TESTING_FORCE_BIND_REMARK);
        expect(mockUi.success).toHaveBeenCalledWith(expect.stringContaining(TESTING_FORCE_BIND_REMARK));
    });
});