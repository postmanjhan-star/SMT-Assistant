import { test, expect, Page } from '@playwright/test';
import { setupAuthToken } from './helpers/auth';
import { expectLatestMessage } from './helpers/scan';
import { waitVisualStepIfNeeded } from './helpers/pageActions';
import { DetailPage, MACHINE_URLS } from './pages/DetailPage';

const FUJI_NORMAL_URL = MACHINE_URLS.fuji.normal;
const FUJI_TESTING_URL = MACHINE_URLS.fuji.testing;
const scanOne = (page: Page, mat: string, slot: string) => new DetailPage(page, 'fuji').scanOne(mat, slot);

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    await setupAuthToken(page);
});

test('test virtual material force warning binding in testing mode', async ({ page }) => {
    const virtualMaterial = 'virtual-no-match-fuji';

    await page.route('**/smt/material_inventory/*', (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith(`/smt/material_inventory/${virtualMaterial}`)) {
            return route.fulfill({
                status: 404,
                contentType: 'application/json',
                body: JSON.stringify({ detail: 'Not Found' }),
            });
        }
        return route.continue();
    });

    await page.goto(FUJI_TESTING_URL);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const targetSlot = 'XP2B1-A-9';
    await scanOne(page, virtualMaterial, targetSlot);

    const row = page.locator(`[row-id="${targetSlot}"]`);
    await expect(row.locator('[col-id="correct"]')).toContainText('⚠️');
    await expect(
        row.locator('[col-id="materialInventoryIdno"]')
    ).toContainText(virtualMaterial);
});

test('fuji detail: first load sets both 首次上料條碼 and 當前上料條碼', async ({ page }) => {
    const mockMounterFiles = [{
        id: 1, file_name: 'test', created_at: '2024-01-01T00:00:00Z', updated_at: null,
        product_idno: '40X85-009B-TEST_SCAN', product_ver: '1',
        mounter_idno: 'XP2B1', board_side: 'TOP',
        fuji_mounter_file_items: [
            { id: 1, fuji_mounter_file_id: 1, stage: 'A', slot: 9, original: 'A', alt_slot: 0, part_number: 'TEST-MAT', feeder_name: 'type-A', feed_count: 100, skip: false, status: 'OK', tray_direction: 0 },
        ],
    }];
    await page.route('**/smt/fuji_mounter/ZZ9999', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMounterFiles) })
    );

    await page.goto(FUJI_NORMAL_URL + '&mock_scan=1');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.getByTestId('fuji-detail-material-input').locator('input');
    const slotInput = page.getByTestId('fuji-detail-slot-input').locator('input');

    await materialInput.fill('FUJI-INIT-PACK');
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill('XP2B1-A-9');
    await slotInput.press('Enter');
    await expect(materialInput).toBeFocused({ timeout: 5000 });

    const row = page.locator('[row-id="XP2B1-A-9"]');
    await expect(row.locator('[col-id="materialInventoryIdno"]')).toContainText('FUJI-INIT-PACK');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText('FUJI-INIT-PACK');
});

test('fuji detail: blocks second load when 當前上料條碼 already set', async ({ page }) => {
    const mockMounterFiles = [{
        id: 1, file_name: 'test', created_at: '2024-01-01T00:00:00Z', updated_at: null,
        product_idno: '40X85-009B-TEST_SCAN', product_ver: '1',
        mounter_idno: 'XP2B1', board_side: 'TOP',
        fuji_mounter_file_items: [
            { id: 1, fuji_mounter_file_id: 1, stage: 'A', slot: 9, original: 'A', alt_slot: 0, part_number: 'TEST-MAT', feeder_name: 'type-A', feed_count: 100, skip: false, status: 'OK', tray_direction: 0 },
        ],
    }];
    await page.route('**/smt/fuji_mounter/ZZ9999', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMounterFiles) })
    );

    await page.goto(FUJI_NORMAL_URL + '&mock_scan=1');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.getByTestId('fuji-detail-material-input').locator('input');
    const slotInput = page.getByTestId('fuji-detail-slot-input').locator('input');

    // first load
    await materialInput.fill('FUJI-INIT-PACK');
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill('XP2B1-A-9');
    await slotInput.press('Enter');
    await expect(materialInput).toBeFocused({ timeout: 5000 });

    // second load attempt — should be blocked by guard
    await materialInput.fill('FUJI-SECOND-PACK');
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill('XP2B1-A-9');
    await slotInput.press('Enter');

    await expectLatestMessage(page, 'error-message', /已有上料條碼.*S5566/);

    const row = page.locator('[row-id="XP2B1-A-9"]');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText('FUJI-INIT-PACK');
});

test('fuji detail: unload clears 當前上料條碼 only, re-scan updates it', async ({ page }, testInfo) => {
    const mockMounterFiles = [{
        id: 1, file_name: 'test', created_at: '2024-01-01T00:00:00Z', updated_at: null,
        product_idno: '40X85-009B-TEST_SCAN', product_ver: '1',
        mounter_idno: 'XP2B1', board_side: 'TOP',
        fuji_mounter_file_items: [
            { id: 1, fuji_mounter_file_id: 1, stage: 'A', slot: 9, original: 'A', alt_slot: 0, part_number: 'TEST-MAT', feeder_name: 'type-A', feed_count: 100, skip: false, status: 'OK', tray_direction: 0 },
        ],
    }];
    await page.route('**/smt/fuji_mounter/ZZ9999', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMounterFiles) })
    );

    await page.goto(FUJI_NORMAL_URL + '&mock_scan=1');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.getByTestId('fuji-detail-material-input').locator('input');
    const slotInput = page.getByTestId('fuji-detail-slot-input').locator('input');
    const row = page.locator('[row-id="XP2B1-A-9"]');

    // initial load — both columns get set
    await materialInput.fill('FUJI-INIT-PACK');
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill('XP2B1-A-9');
    await slotInput.press('Enter');
    await expect(materialInput).toBeFocused({ timeout: 5000 });

    await expect(row.locator('[col-id="materialInventoryIdno"]')).toContainText('FUJI-INIT-PACK');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText('FUJI-INIT-PACK');

    // enter unload mode via S5555
    await materialInput.fill('S5555');
    await materialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);

    const unloadMaterialInput = page.locator('#detail-unload-material-input');
    await expect(unloadMaterialInput).toBeVisible({ timeout: 5000 });

    // unload the pack code
    await unloadMaterialInput.fill('FUJI-INIT-PACK');
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(row.locator('[col-id="correct"]')).toContainText('⛔', { timeout: 5000 });

    // materialInventoryIdno preserved, appendedMaterialInventoryIdno cleared
    await expect(row.locator('[col-id="materialInventoryIdno"]')).toContainText('FUJI-INIT-PACK');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).not.toContainText('FUJI-INIT-PACK');

    // exit unload mode
    await page.getByRole('button', { name: /退出/ }).click();
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(unloadMaterialInput).not.toBeVisible();

    // re-scan after unload
    await materialInput.fill('FUJI-RELOAD-PACK');
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill('XP2B1-A-9');
    await slotInput.press('Enter');
    await expect(materialInput).toBeFocused({ timeout: 5000 });

    // materialInventoryIdno preserved, appendedMaterialInventoryIdno updated
    await expect(row.locator('[col-id="materialInventoryIdno"]')).toContainText('FUJI-INIT-PACK');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText('FUJI-RELOAD-PACK');
});

// ─── Duplicate scan detection ────────────────────────────────────────────────

test('fuji detail: 重複掃描同一條碼顯示錯誤訊息', async ({ page }) => {
    await page.goto(FUJI_NORMAL_URL + '&mock_scan=1');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.getByTestId('fuji-detail-material-input').locator('input');
    const slotInput = page.getByTestId('fuji-detail-slot-input').locator('input');

    // First scan — should succeed
    await materialInput.fill('B4933598');
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill('XP2B1-A-9');
    await slotInput.press('Enter');
    await expect(materialInput).toBeFocused({ timeout: 5000 });

    // Second scan of same barcode — should trigger duplicate error
    await materialInput.fill('B4933598');
    await materialInput.press('Enter');

    await expectLatestMessage(page, 'error-message', '重複掃描');
    await expect(materialInput).toHaveValue('');
});

// ─── IPQC column visibility ───────────────────────────────────────────────────

test('fuji detail: 進入 IPQC 模式後隱藏上料欄位、顯示覆檢欄位', async ({ page }) => {
    await page.goto(FUJI_NORMAL_URL + '&mock_scan=1');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.getByTestId('fuji-detail-material-input').locator('input');

    // Normal columns should be visible before IPQC mode
    await expect(page.locator('.ag-header-cell[col-id="materialInventoryIdno"]')).toBeVisible();

    // Enter IPQC mode via trigger code
    await materialInput.fill('S5588');
    await materialInput.press('Enter');

    // Verify IPQC mode is active: normal input replaced by IPQC inputs
    await expect(page.locator('#detail-ipqc-material-input')).toBeVisible({ timeout: 5000 });

    // IPQC column header should now be visible
    await expect(page.locator('.ag-header-cell[col-id="inspectMaterialPackCode"]')).toBeVisible();

    // Normal material column header should be hidden
    await expect(page.locator('.ag-header-cell[col-id="materialInventoryIdno"]')).not.toBeVisible();
});

test('fuji detail: 退出 IPQC 模式後欄位恢復原狀', async ({ page }) => {
    await page.goto(FUJI_NORMAL_URL + '&mock_scan=1');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.getByTestId('fuji-detail-material-input').locator('input');

    // Enter IPQC mode
    await materialInput.fill('S5588');
    await materialInput.press('Enter');
    await expect(page.locator('#detail-ipqc-material-input')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.ag-header-cell[col-id="inspectMaterialPackCode"]')).toBeVisible();

    // Exit IPQC mode via the exit button
    await page.getByRole('button', { name: /退出.*IPQC/ }).click();

    // Verify we're back to normal mode: IPQC input replaced by normal input
    await expect(page.getByTestId('fuji-detail-material-input').locator('input')).toBeVisible({ timeout: 5000 });

    // Normal columns should be restored
    await expect(page.locator('.ag-header-cell[col-id="materialInventoryIdno"]')).toBeVisible();

    // IPQC columns should be hidden again
    await expect(page.locator('.ag-header-cell[col-id="inspectMaterialPackCode"]')).not.toBeVisible();
});

// ─── Production page: materialInventoryIdno preserved after unload ─────────────

test('fuji production: 生產頁面載入時，首次接料條碼在卸料後仍保留', async ({ page }) => {
    const productionUuid = 'materialInventoryIdno-preserved-fuji-prod';
    const now = new Date().toISOString();
    const later = new Date(Date.now() + 1_000).toISOString();

    const mockStats = [{
        id: 1, work_order_no: 'ZZ9999', product_idno: '40X85-009B-TEST_SCAN',
        machine_idno: 'XP2B1', machine_side: 'FRONT', board_side: 'TOP',
        slot_idno: '9', sub_slot_idno: 'A', material_idno: 'MAT-1',
        production_end: null, produce_mode: 'NORMAL_PRODUCE_MODE',
        feed_records: [
            { id: 1000, feed_record_id: 1000, operation_time: now,
                material_pack_code: 'FUJI-FIRST-PACK',
                feed_material_pack_type: 'IMPORTED_MATERIAL_PACK',
                check_pack_code_match: 'MATCHED_MATERIAL_PACK' },
            { id: 1001, feed_record_id: 1001, operation_time: later,
                material_pack_code: 'FUJI-FIRST-PACK',
                operation_type: 'UNFEED',
                feed_material_pack_type: null },
        ],
    }];

    await page.route(`**/smt/fuji_mounter_item/stats/${productionUuid}`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStats) })
    );
    await page.route(`**/smt/fuji_mounter_item/stats/logs/${productionUuid}`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    await page.goto(`http://localhost/smt/fuji-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const row = page.locator('[row-id="9-A"]');
    await expect(row.locator('[col-id="materialInventoryIdno"]')).toContainText('FUJI-FIRST-PACK');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).not.toContainText('FUJI-FIRST-PACK');
    await expect(row.locator('[col-id="spliceMaterialInventoryIdno"]')).toBeEmpty();
});

test('fuji production: 生產頁面初次載入時，當前上料條碼顯示初始上料條碼且接料欄位為空', async ({ page }) => {
    const productionUuid = 'fuji-imported-pack-initial-load';
    const now = new Date().toISOString();

    const mockStats = [{
        id: 1, work_order_no: 'ZZ9999', product_idno: '40X85-009B-TEST_SCAN',
        machine_idno: 'XP2B1', machine_side: 'FRONT', board_side: 'TOP',
        slot_idno: '9', sub_slot_idno: 'A', material_idno: 'MAT-1',
        production_end: null, produce_mode: 'NORMAL_PRODUCE_MODE',
        feed_records: [
            { id: 1000, feed_record_id: 1000, operation_time: now,
                material_pack_code: 'FUJI-INIT-PACK',
                feed_material_pack_type: 'IMPORTED_MATERIAL_PACK',
                operation_type: 'FEED',
                check_pack_code_match: 'MATCHED_MATERIAL_PACK' },
        ],
    }];

    await page.route(`**/smt/fuji_mounter_item/stats/${productionUuid}`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStats) })
    );
    await page.route(`**/smt/fuji_mounter_item/stats/logs/${productionUuid}`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    await page.goto(`http://localhost/smt/fuji-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const row = page.locator('[row-id="9-A"]');
    await expect(row.locator('[col-id="materialInventoryIdno"]')).toContainText('FUJI-INIT-PACK');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText('FUJI-INIT-PACK');
    await expect(row.locator('[col-id="spliceMaterialInventoryIdno"]')).toBeEmpty();
});

test('fuji production: 生產頁面載入時，主料與接料條碼分欄顯示', async ({ page }) => {
    const productionUuid = 'fuji-active-splice-production-row';
    const now = new Date().toISOString();
    const later = new Date(Date.now() + 1_000).toISOString();

    const mockStats = [{
        id: 1, work_order_no: 'ZZ9999', product_idno: '40X85-009B-TEST_SCAN',
        machine_idno: 'XP2B1', machine_side: 'FRONT', board_side: 'TOP',
        slot_idno: '9', sub_slot_idno: 'A', material_idno: 'MAT-1',
        production_end: null, produce_mode: 'NORMAL_PRODUCE_MODE',
        feed_records: [
            { id: 1000, feed_record_id: 1000, operation_time: now,
                material_pack_code: 'FUJI-FIRST-PACK',
                feed_material_pack_type: 'IMPORTED_MATERIAL_PACK',
                operation_type: 'FEED',
                check_pack_code_match: 'MATCHED_MATERIAL_PACK' },
            { id: 1001, feed_record_id: 1001, operation_time: later,
                material_pack_code: 'FUJI-SPLICE-PACK',
                feed_material_pack_type: 'NEW_MATERIAL_PACK',
                operation_type: 'FEED',
                check_pack_code_match: 'MATCHED_MATERIAL_PACK' },
        ],
    }];

    await page.route(`**/smt/fuji_mounter_item/stats/${productionUuid}`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStats) })
    );
    await page.route(`**/smt/fuji_mounter_item/stats/logs/${productionUuid}`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    await page.goto(`http://localhost/smt/fuji-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const row = page.locator('[row-id="9-A"]');
    await expect(row.locator('[col-id="materialInventoryIdno"]')).toContainText('FUJI-FIRST-PACK');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText('FUJI-FIRST-PACK');
    await expect(row.locator('[col-id="spliceMaterialInventoryIdno"]')).toContainText('FUJI-SPLICE-PACK');
});

