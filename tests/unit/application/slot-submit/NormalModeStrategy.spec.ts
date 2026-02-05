import { NormalModeStrategy } from '@/application/slot-submit/NormalModeStrategy';
import { SlotSubmitDeps } from '@/application/slot-submit/SlotSubmitDeps';
import { SlotSubmitFeedGridAdapter } from '@/ui/slot-submit/SlotSubmitFeedGridAdapter';
import { SlotSubmitContext } from '@/application/slot-submit/SlotSubmitContext';

describe('NormalModeStrategy', () => {
    let strategy: NormalModeStrategy;
    let mockGridApi: any;
    let mockUi: any;
    let mockResetInputs: any;
    let mockAutoUpload: any;
    let deps: SlotSubmitDeps;

    beforeEach(() => {
        // 使用 Fake Timers 來控制 setTimeout
        vi.useFakeTimers();
        
        // 模擬 AG Grid API
        mockGridApi = {
            getRowNode: vi.fn(),
            forEachNode: vi.fn(),
        };

        // 模擬 UI 回饋
        mockUi = {
            success: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        };

        mockResetInputs = vi.fn();
        mockAutoUpload = vi.fn();

        // 建立 MaterialGrid 並模擬其內部方法，隔離測試
        const materialGrid = new SlotSubmitFeedGridAdapter(mockGridApi);
        vi.spyOn(materialGrid, 'cleanErrorMaterialInventory').mockImplementation(() => {});
        vi.spyOn(materialGrid, 'markMismatch').mockImplementation(() => {});
        vi.spyOn(materialGrid, 'checkAllCorrect').mockReturnValue({ allCorrect: false, invalidSlots: [] });

        deps = {
            grid: materialGrid,
            ui: mockUi,
            isTestingMode: false,
            autoUpload: mockAutoUpload,
            resetInputs: mockResetInputs,
        };

        strategy = new NormalModeStrategy(deps);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should warn if no scan result provided (請先掃描物料條碼)', async () => {
        const ctx: SlotSubmitContext = {
            result: null,
            slot: 'A',
            subSlot: '1',
            slotIdno: 'A-1'
        };
        const result = await strategy.submit(ctx);
        expect(result).toBe(false);
        expect(mockUi.warn).toHaveBeenCalledWith('請先掃描物料條碼');
    });

    it('should handle successful match (綁定成功)', async () => {
        vi.spyOn(deps.grid, 'hasRow').mockReturnValue(true);
        vi.spyOn(deps.grid, 'applyBindingSuccess').mockReturnValue(true);
        vi.spyOn(deps.grid, 'getAllRowsData').mockReturnValue([{ slotIdno: 'A', subSlotIdno: '1' }] as any);
        
        // 模擬 checkAllCorrect 回傳 true 以測試自動上傳邏輯
        vi.spyOn(deps.grid, 'checkAllCorrect').mockReturnValue({ allCorrect: true, invalidSlots: [] });

        const ctx: SlotSubmitContext = {
            result: {
                success: true,
                materialInventory: { idno: 'MAT123', remark: 'Test' } as any,
                matchedRows: [{ slotIdno: 'A', subSlotIdno: '1' }]
            },
            slot: 'A',
            subSlot: '1',
            slotIdno: 'A-1'
        };

        const result = await strategy.submit(ctx);

        expect(result).toBe(true);
        expect(deps.grid.hasRow).toHaveBeenCalledWith('A-1');
        expect(deps.grid.applyBindingSuccess).toHaveBeenCalledWith('A-1', 'MAT123', 'Test');
        expect(mockUi.success).toHaveBeenCalled();
        
        // 觸發 setTimeout
        vi.runAllTimers();
        expect(mockAutoUpload).toHaveBeenCalledWith([{ slotIdno: 'A', subSlotIdno: '1' }]);
    });

    it('should handle mismatch (錯誤的槽位)', async () => {

        const ctx: SlotSubmitContext = {
            result: {
                success: true,
                materialInventory: { idno: 'MAT123' } as any,
                matchedRows: [{ slotIdno: 'B', subSlotIdno: '2' }] // 匹配的槽位與輸入不同
            },
            slot: 'A',
            subSlot: '1',
            slotIdno: 'A-1'
        };

        const result = await strategy.submit(ctx);

        expect(result).toBe(false);
        expect(deps.grid.markMismatch).toHaveBeenCalledWith('A', '1', 'MAT123');
        expect(deps.grid.deselectRow).toHaveBeenCalledWith('B-2');
        expect(mockUi.error).toHaveBeenCalledWith(expect.stringContaining('錯誤的槽位'));
    });
});