import { TestingModeStrategy } from '@/application/slot-submit/TestingModeStrategy';
import { SlotSubmitDeps, MaterialGrid } from '@/application/slot-submit/SlotSubmitDeps';
import { SlotSubmitContext } from '@/application/slot-submit/SlotSubmitContext';

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

        const materialGrid = new MaterialGrid(mockGridApi);
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

    it('should force bind if no match found in Testing Mode (廠商測試新料)', async () => {
        const mockRowNode = {
            setDataValue: vi.fn(),
        };
        mockGridApi.getRowNode.mockReturnValue(mockRowNode);

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
        expect(mockRowNode.setDataValue).toHaveBeenCalledWith('correct', 'warning');
        expect(mockRowNode.setDataValue).toHaveBeenCalledWith('remark', '[廠商測試新料]');
        expect(mockUi.success).toHaveBeenCalledWith(expect.stringContaining('已標記為 [廠商測試新料]'));
    });
});
