import { test, expect, Page } from '@playwright/test';
import { setupAuthToken } from './helpers/auth';
import { expectLatestMessage } from './helpers/scan';
import { DetailPage } from './pages/DetailPage';

const getMainMaterialInput = (page: Page) => new DetailPage(page, 'panasonic').materialInput;
const expectMainScanInputsCleared = (page: Page) => new DetailPage(page, 'panasonic').expectMainScanInputsCleared();

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    await setupAuthToken(page);
});

// ─── 接料模式 (Splice Mode) ────────────────────────────────────────────────────

const mockPanasonicSpliceMounterFile = {
    file_name: 'test', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
    product_idno: '40Y85-010A-M3', product_ver: '1',
    mounter_idno: 'A1-NPM-W2', board_side: 'DUPLEX',
    panasonic_mounter_file_items: [
        { id: 1, slot_idno: '10008', sub_slot_idno: 'L', smd_model_idno: 'TEST-MAT',
          feeder_idno: 'F1', smd_description: 'Test', smd_quantity: 1 },
    ],
};

const PANASONIC_SPLICE_URL = 'http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3&mock_scan=1';

async function setupPanasonicSplicePage(page: any) {
    await page.route('**/smt/panasonic_mounter/A1-NPM-W2/ZZ9999', (route: any) =>
        route.fulfill({ status: 200, contentType: 'application/json',
            body: JSON.stringify(mockPanasonicSpliceMounterFile) })
    );
    await page.goto(PANASONIC_SPLICE_URL);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();
}

async function panasonicFirstLoad(page: any) {
    const materialInput = page.getByTestId('panasonic-main-material-input').locator('input');
    const slotInput = page.getByTestId('panasonic-main-slot-input').locator('input');
    await materialInput.fill('PACK-OLD');
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill('10008-L');
    await slotInput.press('Enter');
    await expect(materialInput).toBeFocused({ timeout: 5000 });
}

test('panasonic detail: 掃 S5566 進入接料模式，接料輸入框出現', async ({ page }) => {
    await setupPanasonicSplicePage(page);
    await panasonicFirstLoad(page);

    const materialInput = page.getByTestId('panasonic-main-material-input').locator('input');
    await materialInput.fill('S5566');
    await materialInput.press('Enter');

    await expect(page.getByTestId('panasonic-splice-material-input')).toBeVisible();
    await expect(page.getByTestId('panasonic-main-material-input').locator('input')).not.toBeVisible();
    await expect(page.getByRole('button', { name: '退出📥接料模式' })).toBeVisible();
});

test('panasonic detail: 接料完整流程 舊料→新料→站位 保留 appended 並更新 spliceMaterialInventoryIdno', async ({ page }) => {
    await setupPanasonicSplicePage(page);
    await panasonicFirstLoad(page);

    const row = page.locator('[row-id="10008-L"]');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText('PACK-OLD');

    // 進入接料模式
    const materialInput = page.getByTestId('panasonic-main-material-input').locator('input');
    await materialInput.fill('S5566');
    await materialInput.press('Enter');

    const spliceMaterialInput = page.getByTestId('panasonic-splice-material-input');
    const spliceSlotInput = page.getByTestId('panasonic-splice-slot-input');

    // SPLICE_IDLE：掃舊料
    await spliceMaterialInput.fill('PACK-OLD');
    await spliceMaterialInput.press('Enter');
    await expect(row.locator('[col-id="correct"]')).toContainText('⛔');

    // SPLICE_NEW_SCAN：掃新料（handleBeforeMaterialScan 攔截，focus 不自動移）
    await spliceMaterialInput.fill('PACK-NEW');
    await spliceMaterialInput.press('Enter');

    // SPLICE_SLOT_SCAN：等 slot input 可用後確認站位
    await expect(spliceSlotInput).toBeEnabled({ timeout: 5000 });
    await spliceSlotInput.click();
    await spliceSlotInput.fill('10008-L');
    await spliceSlotInput.press('Enter');

    await expect(row.locator('[col-id="correct"]')).toContainText('✅');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText('PACK-OLD');
    await expect(row.locator('[col-id="spliceMaterialInventoryIdno"]')).toContainText('PACK-NEW');
    // 完成後回 SPLICE_IDLE，仍在接料模式
    await expect(spliceMaterialInput).toBeVisible();
});

test('panasonic detail: 接料 IDLE 掃不在格線中的捲號顯示錯誤', async ({ page }) => {
    await setupPanasonicSplicePage(page);
    await panasonicFirstLoad(page);

    const row = page.locator('[row-id="10008-L"]');

    const materialInput = page.getByTestId('panasonic-main-material-input').locator('input');
    await materialInput.fill('S5566');
    await materialInput.press('Enter');

    const spliceMaterialInput = page.getByTestId('panasonic-splice-material-input');
    await spliceMaterialInput.fill('PACK-NOT-EXIST');
    await spliceMaterialInput.press('Enter');

    await expectLatestMessage(page, 'error-message', /請先掃描已上料的捲號進行接料/);
    await expect(row.locator('[col-id="correct"]')).toContainText('✅');
});

test('panasonic detail: 接料進行中退出接料模式，correct 狀態還原為 ✅', async ({ page }) => {
    await setupPanasonicSplicePage(page);
    await panasonicFirstLoad(page);

    const row = page.locator('[row-id="10008-L"]');
    await expect(row.locator('[col-id="correct"]')).toContainText('✅');

    // 進入接料模式
    const materialInput = page.getByTestId('panasonic-main-material-input').locator('input');
    await materialInput.fill('S5566');
    await materialInput.press('Enter');

    // SPLICE_IDLE：掃舊料 → row 轉 ⛔
    const spliceMaterialInput = page.getByTestId('panasonic-splice-material-input');
    await spliceMaterialInput.fill('PACK-OLD');
    await spliceMaterialInput.press('Enter');
    await expect(row.locator('[col-id="correct"]')).toContainText('⛔');

    // 退出接料模式
    await page.getByText('退出📥接料模式').click();

    await expect(row.locator('[col-id="correct"]')).toContainText('✅');
    await expect(page.getByTestId('panasonic-splice-material-input')).not.toBeVisible();
    await expect(page.getByTestId('panasonic-main-material-input').locator('input')).toBeVisible();
});

test('panasonic detail: 接料模式掃 S5555 切換至換料卸除模式', async ({ page }) => {
    await setupPanasonicSplicePage(page);
    await panasonicFirstLoad(page);

    // 進入接料模式
    const materialInput = page.getByTestId('panasonic-main-material-input').locator('input');
    await materialInput.fill('S5566');
    await materialInput.press('Enter');
    await expect(page.getByTestId('panasonic-splice-material-input')).toBeVisible();

    // 在接料模式下掃 S5555 → 切至換料卸除
    const spliceMaterialInput = page.getByTestId('panasonic-splice-material-input');
    await spliceMaterialInput.fill('S5555');
    await spliceMaterialInput.press('Enter');

    await expect(page.getByTestId('panasonic-splice-material-input')).not.toBeVisible();
    await expect(page.locator('#detail-unload-material-input')).toBeVisible();
});

// ─── 生產頁面接料模式 (Production Splice Mode) ────────────────────────────────

const PAN_PROD_SPLICE_UUID = 'pan-prod-splice-test';

const panProdSpliceMockStats = [{
    id: 1, work_order_no: 'ZZ9999', product_idno: '40Y85-010A-M3',
    machine_idno: 'A1-NPM-W2', machine_side: 'FRONT', board_side: 'DUPLEX',
    slot_idno: '10008', sub_slot_idno: 'L', material_idno: 'TEST-MAT',
    production_end: null, produce_mode: 'NORMAL_PRODUCE_MODE',
    feed_records: [{
        id: 1000, feed_record_id: 1000, operation_time: '2024-01-01T00:00:00Z',
        material_pack_code: 'PAN-PROD-OLD',
        feed_material_pack_type: 'IMPORTED_MATERIAL_PACK',
        operation_type: 'FEED',
        check_pack_code_match: 'MATCHED_MATERIAL_PACK',
    }],
}];

async function setupPanasonicProductionSplicePage(page: any) {
    await page.route(`**/smt/panasonic_mounter_item/stats/${PAN_PROD_SPLICE_UUID}`, (route: any) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(panProdSpliceMockStats) })
    );
    await page.route(`**/smt/panasonic_mounter_item/stats/logs/${PAN_PROD_SPLICE_UUID}`, (route: any) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );
    await page.goto(`http://localhost/smt/panasonic-mounter-production/${PAN_PROD_SPLICE_UUID}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();
}

test('panasonic production: 掃 S5566 進入接料模式，接料輸入框出現', async ({ page }) => {
    await setupPanasonicProductionSplicePage(page);

    const materialInput = page.getByTestId('panasonic-main-material-input').locator('input');
    await materialInput.fill('S5566');
    await materialInput.press('Enter');

    await expect(page.getByTestId('panasonic-splice-material-input')).toBeVisible();
    await expect(page.getByTestId('panasonic-main-material-input').locator('input')).not.toBeVisible();
    await expect(page.getByRole('button', { name: '退出📥接料模式' })).toBeVisible();
});

test('panasonic production: 接料完整流程 舊料→新料→站位 更新 spliceMaterialInventoryIdno', async ({ page }) => {
    await page.route('**/smt/material_inventory/**', (route: any) =>
        route.fulfill({ status: 200, contentType: 'application/json',
            body: JSON.stringify({ idno: 'PAN-PROD-NEW', material_idno: 'TEST-MAT' }) })
    );
    await page.route('**/smt/panasonic_mounter_item/stat/roll', (route: any) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await setupPanasonicProductionSplicePage(page);

    // 進入接料模式
    const materialInput = page.getByTestId('panasonic-main-material-input').locator('input');
    await materialInput.fill('S5566');
    await materialInput.press('Enter');

    const spliceMaterialInput = page.getByTestId('panasonic-splice-material-input');
    const spliceSlotInput = page.getByTestId('panasonic-splice-slot-input');
    const row = page.locator('[row-id="10008-L"]');

    // SPLICE_IDLE：掃舊料
    await spliceMaterialInput.fill('PAN-PROD-OLD');
    await spliceMaterialInput.press('Enter');
    await expect(row.locator('[col-id="correct"]')).toContainText('⛔');

    // SPLICE_NEW_SCAN：掃新料
    await spliceMaterialInput.fill('PAN-PROD-NEW');
    await spliceMaterialInput.press('Enter');

    // SPLICE_SLOT_SCAN：等 slot input 可用後確認站位
    await expect(spliceSlotInput).toBeEnabled({ timeout: 5000 });
    await spliceSlotInput.click();
    await spliceSlotInput.fill('10008-L');
    await spliceSlotInput.press('Enter');

    await expect(row.locator('[col-id="correct"]')).toContainText('✅');
    await expect(row.locator('[col-id="spliceMaterialInventoryIdno"]')).toContainText('PAN-PROD-NEW');
    // 完成後仍在接料模式
    await expect(spliceMaterialInput).toBeVisible();
});

test('panasonic production: 接料進行中退出接料模式，correct 狀態還原為 ✅', async ({ page }) => {
    await setupPanasonicProductionSplicePage(page);

    // 進入接料模式
    const materialInput = page.getByTestId('panasonic-main-material-input').locator('input');
    await materialInput.fill('S5566');
    await materialInput.press('Enter');

    // SPLICE_IDLE：掃舊料 → row 轉 ⛔
    const spliceMaterialInput = page.getByTestId('panasonic-splice-material-input');
    await spliceMaterialInput.fill('PAN-PROD-OLD');
    await spliceMaterialInput.press('Enter');

    const row = page.locator('[row-id="10008-L"]');
    await expect(row.locator('[col-id="correct"]')).toContainText('⛔');

    // 退出接料模式
    await page.getByText('退出📥接料模式').click();

    await expect(row.locator('[col-id="correct"]')).toContainText('✅');
    await expect(page.getByTestId('panasonic-splice-material-input')).not.toBeVisible();
    await expect(page.getByTestId('panasonic-main-material-input').locator('input')).toBeVisible();
});
