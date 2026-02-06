import { NormalModeStrategy } from '@/application/slot-submit/NormalModeStrategy';
import { SlotSubmitDeps } from '@/application/slot-submit/SlotSubmitDeps';
import { SlotSubmitFeedGridAdapter } from '@/ui/slot-submit/SlotSubmitFeedGridAdapter';
import { SlotSubmitContext } from '@/application/slot-submit/SlotSubmitContext';
import { createPinia, setActivePinia } from 'pinia';
import { useSlotSubmitStore } from '@/stores/slotSubmitStore';

describe('NormalModeStrategy', () => {
    let strategy: NormalModeStrategy;
    let mockGridApi: any;
    let mockResetInputs: any;
    let deps: SlotSubmitDeps;
    let store: ReturnType<typeof useSlotSubmitStore>;
    let materialGrid: SlotSubmitFeedGridAdapter;

    beforeEach(() => {
        setActivePinia(createPinia());
        store = useSlotSubmitStore();
        store.setTestingMode(false);

        // 模擬 AG Grid API
        mockGridApi = {
            getRowNode: vi.fn(),
            forEachNode: vi.fn(),
        };

        mockResetInputs = vi.fn();

        // 建立 MaterialGrid 並模擬其內部方法，隔離測試
        materialGrid = new SlotSubmitFeedGridAdapter(mockGridApi);
        vi.spyOn(materialGrid, 'cleanErrorMaterialInventory').mockImplementation(() => {});
        vi.spyOn(materialGrid, 'markMismatch').mockImplementation(() => {});

        store.bindDeps({
            grid: materialGrid,
            resetInputs: mockResetInputs,
        });

        deps = { store };

        strategy = new NormalModeStrategy(deps);
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
        expect(store.lastResult).toEqual({ type: 'warn', message: '請先掃描物料條碼' });
    });

    it('should handle successful match (綁定成功)', async () => {
        vi.spyOn(materialGrid, 'hasRow').mockReturnValue(true);
        vi.spyOn(materialGrid, 'applyBindingSuccess').mockReturnValue(true);

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
        expect(materialGrid.hasRow).toHaveBeenCalledWith('A-1');
        expect(materialGrid.applyBindingSuccess).toHaveBeenCalledWith('A-1', 'MAT123', 'Test');
        expect(mockResetInputs).toHaveBeenCalled();
        expect(store.lastResult).toEqual({
            type: 'success',
            message: '✅ 正式生產模式：槽位 A-1 綁定成功',
        });
    });

    it('should handle mismatch (錯誤的槽位)', async () => {
        vi.spyOn(materialGrid, 'deselectRow').mockReturnValue(true);

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
        expect(materialGrid.markMismatch).toHaveBeenCalledWith('A', '1', 'MAT123');
        expect(materialGrid.deselectRow).toHaveBeenCalledWith('B-2');
        expect(store.lastResult?.message).toContain('錯誤的槽位');
        expect(mockResetInputs).toHaveBeenCalled();
    });
});
