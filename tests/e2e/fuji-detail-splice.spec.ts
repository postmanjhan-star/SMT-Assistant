import { test, expect, Page } from '@playwright/test';
import { setupAuthToken } from './helpers/auth';
import { expectLatestMessage } from './helpers/scan';
import { DetailPage, MACHINE_URLS } from './pages/DetailPage';

const FUJI_NORMAL_URL = MACHINE_URLS.fuji.normal;
const scanOne = (page: Page, mat: string, slot: string) => new DetailPage(page, 'fuji').scanOne(mat, slot);

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    await setupAuthToken(page);
});

// ─── 接料模式 (Splice Mode) ────────────────────────────────────────────────────

const mockFujiSpliceMounterFiles = [{
    id: 1, file_name: 'test', created_at: '2024-01-01T00:00:00Z', updated_at: null,
    product_idno: '40X85-009B-TEST_SCAN', product_ver: '1',
    mounter_idno: 'XP2B1', board_side: 'TOP',
    fuji_mounter_file_items: [
        { id: 1, fuji_mounter_file_id: 1, stage: 'A', slot: 9, original: 'A', alt_slot: 0,
          part_number: 'TEST-MAT', feeder_name: 'type-A', feed_count: 100,
          skip: false, status: 'OK', tray_direction: 0 },
    ],
}];

async function setupFujiSplicePage(page: any) {
    await page.route('**/smt/fuji_mounter/ZZ9999', (route: any) =>
        route.fulfill({ status: 200, contentType: 'application/json',
            body: JSON.stringify(mockFujiSpliceMounterFiles) })
    );
    await page.goto(FUJI_NORMAL_URL + '&mock_scan=1');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();
}

async function fujiFirstLoad(page: any) {
    const materialInput = page.getByTestId('fuji-detail-material-input').locator('input');
    const slotInput = page.getByTestId('fuji-detail-slot-input').locator('input');
    await materialInput.fill('PACK-OLD');
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill('XP2B1-A-9');
    await slotInput.press('Enter');
    await expect(materialInput).toBeFocused({ timeout: 5000 });
}

test('fuji detail: 掃 S5566 進入接料模式，接料輸入框出現', async ({ page }) => {
    await setupFujiSplicePage(page);
    await fujiFirstLoad(page);

    const materialInput = page.getByTestId('fuji-detail-material-input').locator('input');
    await materialInput.fill('S5566');
    await materialInput.press('Enter');

    await expect(page.getByTestId('fuji-detail-splice-material-input')).toBeVisible();
    await expect(page.getByTestId('fuji-detail-material-input').locator('input')).not.toBeVisible();
    await expect(page.getByRole('button', { name: '退出📥接料模式' })).toBeVisible();
});

test('fuji detail: 接料完整流程 舊料→新料→站位 保留 appended 並更新 spliceMaterialInventoryIdno', async ({ page }) => {
    await setupFujiSplicePage(page);
    await fujiFirstLoad(page);

    const row = page.locator('[row-id="XP2B1-A-9"]');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText('PACK-OLD');

    // 進入接料模式
    const materialInput = page.getByTestId('fuji-detail-material-input').locator('input');
    await materialInput.fill('S5566');
    await materialInput.press('Enter');

    const spliceMaterialInput = page.getByTestId('fuji-detail-splice-material-input');
    const spliceSlotInput = page.getByTestId('fuji-detail-splice-slot-input');

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
    await spliceSlotInput.fill('XP2B1-A-9');
    await spliceSlotInput.press('Enter');

    await expect(row.locator('[col-id="correct"]')).toContainText('✅');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText('PACK-OLD');
    await expect(row.locator('[col-id="spliceMaterialInventoryIdno"]')).toContainText('PACK-NEW');
    // 完成後回 SPLICE_IDLE，仍在接料模式
    await expect(spliceMaterialInput).toBeVisible();
});

test('fuji detail: 接料 IDLE 掃不在格線中的捲號顯示錯誤', async ({ page }) => {
    await setupFujiSplicePage(page);
    await fujiFirstLoad(page);

    const row = page.locator('[row-id="XP2B1-A-9"]');

    const materialInput = page.getByTestId('fuji-detail-material-input').locator('input');
    await materialInput.fill('S5566');
    await materialInput.press('Enter');

    const spliceMaterialInput = page.getByTestId('fuji-detail-splice-material-input');
    await spliceMaterialInput.fill('PACK-NOT-EXIST');
    await spliceMaterialInput.press('Enter');

    await expectLatestMessage(page, 'error-message', /請先掃描已上料的捲號進行接料/);
    await expect(row.locator('[col-id="correct"]')).toContainText('✅');
});

test('fuji detail: 接料進行中退出接料模式，correct 狀態還原為 ✅', async ({ page }) => {
    await setupFujiSplicePage(page);
    await fujiFirstLoad(page);

    const row = page.locator('[row-id="XP2B1-A-9"]');
    await expect(row.locator('[col-id="correct"]')).toContainText('✅');

    // 進入接料模式
    const materialInput = page.getByTestId('fuji-detail-material-input').locator('input');
    await materialInput.fill('S5566');
    await materialInput.press('Enter');

    // SPLICE_IDLE：掃舊料 → row 轉 ⛔
    const spliceMaterialInput = page.getByTestId('fuji-detail-splice-material-input');
    await spliceMaterialInput.fill('PACK-OLD');
    await spliceMaterialInput.press('Enter');
    await expect(row.locator('[col-id="correct"]')).toContainText('⛔');

    // 退出接料模式
    await page.getByText('退出📥接料模式').click();

    await expect(row.locator('[col-id="correct"]')).toContainText('✅');
    await expect(page.getByTestId('fuji-detail-splice-material-input')).not.toBeVisible();
    await expect(page.getByTestId('fuji-detail-material-input').locator('input')).toBeVisible();
});

test('fuji detail: 接料模式掃 S5555 切換至換料卸除模式', async ({ page }) => {
    await setupFujiSplicePage(page);
    await fujiFirstLoad(page);

    // 進入接料模式
    const materialInput = page.getByTestId('fuji-detail-material-input').locator('input');
    await materialInput.fill('S5566');
    await materialInput.press('Enter');
    await expect(page.getByTestId('fuji-detail-splice-material-input')).toBeVisible();

    // 在接料模式下掃 S5555 → 切至換料卸除
    const spliceMaterialInput = page.getByTestId('fuji-detail-splice-material-input');
    await spliceMaterialInput.fill('S5555');
    await spliceMaterialInput.press('Enter');

    await expect(page.getByTestId('fuji-detail-splice-material-input')).not.toBeVisible();
    await expect(page.locator('#detail-unload-material-input')).toBeVisible();
});

// ─── 生產頁面接料模式 (Production Splice Mode) ────────────────────────────────

const FUJI_PROD_SPLICE_UUID = 'fuji-prod-splice-test';

const fujiProdSpliceMockStats = [{
    id: 1, work_order_no: 'ZZ9999', product_idno: '40X85-009B-TEST_SCAN',
    machine_idno: 'XP2B1', machine_side: 'FRONT', board_side: 'TOP',
    slot_idno: '9', sub_slot_idno: 'A', material_idno: 'MAT-1',
    production_end: null, produce_mode: 'NORMAL_PRODUCE_MODE',
    feed_records: [{
        id: 1000, feed_record_id: 1000, operation_time: '2024-01-01T00:00:00Z',
        material_pack_code: 'FUJI-PROD-OLD',
        feed_material_pack_type: 'IMPORTED_MATERIAL_PACK',
        operation_type: 'FEED',
        check_pack_code_match: 'MATCHED_MATERIAL_PACK',
    }],
}];

async function setupFujiProductionSplicePage(page: any) {
    await page.route(`**/smt/fuji_mounter_item/stats/${FUJI_PROD_SPLICE_UUID}`, (route: any) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fujiProdSpliceMockStats) })
    );
    await page.route(`**/smt/fuji_mounter_item/stats/logs/${FUJI_PROD_SPLICE_UUID}`, (route: any) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );
    await page.goto(`http://localhost/smt/fuji-mounter-production/${FUJI_PROD_SPLICE_UUID}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();
}

test('fuji production: 掃 S5566 進入接料模式，接料輸入框出現', async ({ page }) => {
    await setupFujiProductionSplicePage(page);

    const materialInput = page.getByTestId('fuji-production-material-input').locator('input');
    await materialInput.fill('S5566');
    await materialInput.press('Enter');

    await expect(page.getByTestId('fuji-production-splice-material-input')).toBeVisible();
    await expect(page.getByTestId('fuji-production-material-input').locator('input')).not.toBeVisible();
    await expect(page.getByRole('button', { name: '退出📥接料模式' })).toBeVisible();
});

test('fuji production: 接料完整流程 舊料→新料→站位 更新 spliceMaterialInventoryIdno', async ({ page }) => {
    await page.route('**/smt/material_inventory/**', (route: any) =>
        route.fulfill({ status: 200, contentType: 'application/json',
            body: JSON.stringify({ idno: 'FUJI-PROD-NEW', material_idno: 'MAT-1' }) })
    );
    await page.route('**/smt/fuji_mounter_item/stat/roll', (route: any) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await setupFujiProductionSplicePage(page);

    // 進入接料模式
    const materialInput = page.getByTestId('fuji-production-material-input').locator('input');
    await materialInput.fill('S5566');
    await materialInput.press('Enter');

    const spliceMaterialInput = page.getByTestId('fuji-production-splice-material-input');
    const spliceSlotInput = page.getByTestId('fuji-production-splice-slot-input');
    const row = page.locator('[row-id="9-A"]');

    // SPLICE_IDLE：掃舊料
    await spliceMaterialInput.fill('FUJI-PROD-OLD');
    await spliceMaterialInput.press('Enter');
    await expect(row.locator('[col-id="correct"]')).toContainText('⛔');

    // SPLICE_NEW_SCAN：掃新料
    await spliceMaterialInput.fill('FUJI-PROD-NEW');
    await spliceMaterialInput.press('Enter');

    // SPLICE_SLOT_SCAN：等 slot input 可用後確認站位
    await expect(spliceSlotInput).toBeEnabled({ timeout: 5000 });
    await spliceSlotInput.click();
    await spliceSlotInput.fill('XP2B1-A-9');
    await spliceSlotInput.press('Enter');

    await expect(row.locator('[col-id="correct"]')).toContainText('✅');
    await expect(row.locator('[col-id="spliceMaterialInventoryIdno"]')).toContainText('FUJI-PROD-NEW');
    // 完成後仍在接料模式
    await expect(spliceMaterialInput).toBeVisible();
});

test('fuji production: 接料進行中退出接料模式，correct 狀態還原為 ✅', async ({ page }) => {
    await setupFujiProductionSplicePage(page);

    // 進入接料模式
    const materialInput = page.getByTestId('fuji-production-material-input').locator('input');
    await materialInput.fill('S5566');
    await materialInput.press('Enter');

    // SPLICE_IDLE：掃舊料 → row 轉 ⛔
    const spliceMaterialInput = page.getByTestId('fuji-production-splice-material-input');
    await spliceMaterialInput.fill('FUJI-PROD-OLD');
    await spliceMaterialInput.press('Enter');

    const row = page.locator('[row-id="9-A"]');
    await expect(row.locator('[col-id="correct"]')).toContainText('⛔');

    // 退出接料模式
    await page.getByText('退出📥接料模式').click();

    await expect(row.locator('[col-id="correct"]')).toContainText('✅');
    await expect(page.getByTestId('fuji-production-splice-material-input')).not.toBeVisible();
    await expect(page.getByTestId('fuji-production-material-input').locator('input')).toBeVisible();
});
