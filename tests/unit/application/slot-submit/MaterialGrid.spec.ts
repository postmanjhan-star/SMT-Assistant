import { SlotSubmitFeedGridAdapter } from '@/ui/shared/grid/slot-submit/SlotSubmitFeedGridAdapter';

describe('SlotSubmitFeedGridAdapter', () => {
    let grid: SlotSubmitFeedGridAdapter;
    let mockGridApi: any;

    beforeEach(() => {
        mockGridApi = {
            forEachNode: vi.fn(),
            getRowNode: vi.fn(),
        };
        grid = new SlotSubmitFeedGridAdapter(mockGridApi);
    });

    describe('cleanErrorMaterialInventory', () => {
        it('should clear data for same material on different slot if incorrect', () => {
            const mockNode = {
                data: {
                    materialInventoryIdno: 'MAT123',
                    slotIdno: 'B',
                    subSlotIdno: '2',
                    correct: 'false'
                },
                setDataValue: vi.fn()
            };

            // 模擬 forEachNode 迭代
            mockGridApi.forEachNode.mockImplementation((callback: any) => {
                callback(mockNode);
            });

            // 當前輸入是 A-1，之前錯誤在 B-2，應該要清除 B-2
            grid.cleanErrorMaterialInventory('MAT123', 'A', '1');

            expect(mockNode.setDataValue).toHaveBeenCalledWith('materialInventoryIdno', '');
            expect(mockNode.setDataValue).toHaveBeenCalledWith('correct', '');
        });

        it('should NOT clear data if slot is the same', () => {
            const mockNode = {
                data: {
                    materialInventoryIdno: 'MAT123',
                    slotIdno: 'A',
                    subSlotIdno: '1',
                    correct: 'false'
                },
                setDataValue: vi.fn()
            };

            mockGridApi.forEachNode.mockImplementation((callback: any) => {
                callback(mockNode);
            });

            // 當前輸入是 A-1，錯誤也在 A-1，不應清除（因為正在修正它）
            grid.cleanErrorMaterialInventory('MAT123', 'A', '1');

            expect(mockNode.setDataValue).not.toHaveBeenCalled();
        });
    });

    describe('checkAllCorrect', () => {
        it('should return true if all nodes are correct', () => {
            mockGridApi.forEachNode.mockImplementation((callback: any) => {
                callback({ data: { correct: 'true', slotIdno: 'A', subSlotIdno: '1' } });
                callback({ data: { correct: 'true', slotIdno: 'A', subSlotIdno: '2' } });
            });

            const result = grid.checkAllCorrect();
            expect(result.allCorrect).toBe(true);
            expect(result.invalidSlots).toHaveLength(0);
        });

        it('should return false if any node is incorrect', () => {
            mockGridApi.forEachNode.mockImplementation((callback: any) => {
                callback({ data: { correct: 'true', slotIdno: 'A', subSlotIdno: '1' } });
                callback({ data: { correct: 'false', slotIdno: 'A', subSlotIdno: '2' } });
            });

            const result = grid.checkAllCorrect();
            expect(result.allCorrect).toBe(false);
            expect(result.invalidSlots).toContain('A-2');
        });
    });
});
