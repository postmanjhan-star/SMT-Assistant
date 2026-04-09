import { test, expect, Page } from '@playwright/test';
import { setupAuthToken } from './helpers/auth';
import { expectLatestMessage } from './helpers/scan';
import { waitVisualStepIfNeeded } from './helpers/pageActions';
import { DetailPage } from './pages/DetailPage';

const getMainMaterialInput = (page: Page) => new DetailPage(page, 'panasonic').materialInput;
const getMainSlotInput = (page: Page) => new DetailPage(page, 'panasonic').slotInput;
const scanOne = (page: Page, mat: string, slot: string) => new DetailPage(page, 'panasonic').scanOne(mat, slot);

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    await setupAuthToken(page);
});

const MATERIAL_LOOKUP_ERROR_CASES: Array<{
    label: string;
    status: number;
    expectedMessage: string;
}> = [
    { label: '404 not found', status: 404, expectedMessage: '查無此條碼' },
    { label: '500 server error', status: 500, expectedMessage: '系統錯誤' },
    { label: '502 bad gateway', status: 502, expectedMessage: 'ERP 連線錯誤，請確認 ERP 連線【請聯繫資訊管理部門】' },
    { label: '504 timeout', status: 504, expectedMessage: 'ERP 連線超時，請確認 ERP 連線' },
];

for (const errorCase of MATERIAL_LOOKUP_ERROR_CASES) {
    test(`test material scan shows shared ERP error (${errorCase.label}) in panasonic detail page`, async ({ page }, testInfo) => {
        const unreachableMaterial = `erp-error-panasonic-detail-${errorCase.status}`;

        await page.route('**/smt/material_inventory/*', (route) => {
            const url = new URL(route.request().url());
            if (url.pathname.endsWith(`/smt/material_inventory/${unreachableMaterial}`)) {
                return route.fulfill({
                    status: errorCase.status,
                    contentType: 'application/json',
                    body: JSON.stringify({ detail: `Mock ${errorCase.status}` }),
                });
            }
            return route.continue();
        });

        await page.goto("http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3");
        await expect(page.locator(".ag-root-wrapper")).toBeVisible();

        const materialInput = getMainMaterialInput(page);
        const slotInput = getMainSlotInput(page);
        await materialInput.fill(unreachableMaterial);
        await materialInput.press('Enter');
        await waitVisualStepIfNeeded(page, testInfo);

        await expectLatestMessage(page, 'error-message', errorCase.expectedMessage);
        await expect(materialInput).toHaveValue('');
        await expect(materialInput).toBeFocused();
        await expect(slotInput).not.toBeFocused();
    });
}

for (const errorCase of MATERIAL_LOOKUP_ERROR_CASES) {
    test(`test material scan shows shared ERP error (${errorCase.label}) in panasonic production page`, async ({ page }, testInfo) => {
        const productionUuid = `erp-error-panasonic-production-${errorCase.status}`;
        const unreachableMaterial = `erp-error-panasonic-production-${errorCase.status}`;
        const now = new Date().toISOString();

        const mockStats = [
            {
                id: 1,
                work_order_no: 'ZZ9999',
                product_idno: '40Y85-010A-M3',
                machine_idno: 'A1-NPM-W2',
                machine_side: 'FRONT',
                board_side: 'DUPLEX',
                slot_idno: '10008',
                sub_slot_idno: 'L',
                material_idno: '88120-0001-S0',
                production_end: null,
                produce_mode: 'NORMAL_PRODUCE_MODE',
                feed_records: [
                    {
                        id: 1000,
                        feed_record_id: 1000,
                        operation_time: now,
                        material_pack_code: 'MAIN-L',
                        feed_material_pack_type: 'IMPORTED_MATERIAL_PACK',
                        check_pack_code_match: 'MATCHED_MATERIAL_PACK',
                    },
                ],
            },
        ];

        await page.route(`**/smt/panasonic_mounter_item/stats/${productionUuid}`, (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockStats),
            })
        );

        await page.route(`**/smt/panasonic_mounter_item/stats/logs/${productionUuid}`, (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            })
        );

        await page.route('**/smt/material_inventory/*', (route) => {
            const url = new URL(route.request().url());
            if (url.pathname.endsWith(`/smt/material_inventory/${unreachableMaterial}`)) {
                return route.fulfill({
                    status: errorCase.status,
                    contentType: 'application/json',
                    body: JSON.stringify({ detail: `Mock ${errorCase.status}` }),
                });
            }
            return route.continue();
        });

        await page.goto(`http://localhost/smt/panasonic-mounter-production/${productionUuid}`);
        await expect(page.locator('.ag-root-wrapper')).toBeVisible();

        const materialInput = getMainMaterialInput(page);
        const slotInput = getMainSlotInput(page);
        await materialInput.fill(unreachableMaterial);
        await materialInput.press('Enter');
        await waitVisualStepIfNeeded(page, testInfo);

        await expectLatestMessage(page, 'error-message', errorCase.expectedMessage);
        await expect(materialInput).toHaveValue('');
        await expect(materialInput).toBeFocused();
        await expect(slotInput).not.toBeFocused();
    });
}


test('test virtual material force warning binding in testing mode', async ({ page }) => {
    const virtualMaterial = 'virtual-no-match-panasonic';
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

    await page.goto("http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3&testing_mode=1&testing_product_idno=40Y85-010A-M3");
    await expect(page.locator(".ag-root-wrapper")).toBeVisible();

    const targetSlot = '10008-L';
    await scanOne(page, virtualMaterial, targetSlot);

    const row = page.locator(`[row-id="${targetSlot}"]`);
    await expect(row.locator('[col-id="correct"]')).toContainText('⚠️');
    await expect(
        row.locator('[col-id="materialInventoryIdno"]')
    ).toContainText(virtualMaterial);
});

test('panasonic detail: first load sets both 首次上料條碼 and 當前上料條碼', async ({ page }) => {
    const mockMounterFile = {
        file_name: 'test', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
        product_idno: '40Y85-010A-M3', product_ver: '1',
        mounter_idno: 'A1-NPM-W2', board_side: 'DUPLEX',
        panasonic_mounter_file_items: [
            { id: 1, slot_idno: '10008', sub_slot_idno: 'L', smd_model_idno: 'TEST-MAT', feeder_idno: 'F1', smd_description: 'Test', smd_quantity: 1 },
        ],
    };
    await page.route('**/smt/panasonic_mounter/A1-NPM-W2/ZZ9999', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMounterFile) })
    );

    await page.goto('http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3&mock_scan=1');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = getMainMaterialInput(page);
    const slotInput = getMainSlotInput(page);

    await materialInput.fill('PAN-INIT-PACK');
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill('10008-L');
    await slotInput.press('Enter');
    await expect(materialInput).toBeFocused({ timeout: 5000 });

    const row = page.locator('[row-id="10008-L"]');
    await expect(row.locator('[col-id="materialInventoryIdno"]')).toContainText('PAN-INIT-PACK');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText('PAN-INIT-PACK');
});

test('panasonic detail: blocks second load when 當前上料條碼 already set', async ({ page }) => {
    const mockMounterFile = {
        file_name: 'test', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
        product_idno: '40Y85-010A-M3', product_ver: '1',
        mounter_idno: 'A1-NPM-W2', board_side: 'DUPLEX',
        panasonic_mounter_file_items: [
            { id: 1, slot_idno: '10008', sub_slot_idno: 'L', smd_model_idno: 'TEST-MAT', feeder_idno: 'F1', smd_description: 'Test', smd_quantity: 1 },
        ],
    };
    await page.route('**/smt/panasonic_mounter/A1-NPM-W2/ZZ9999', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMounterFile) })
    );

    await page.goto('http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3&mock_scan=1');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = getMainMaterialInput(page);
    const slotInput = getMainSlotInput(page);

    // first load
    await materialInput.fill('PAN-INIT-PACK');
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill('10008-L');
    await slotInput.press('Enter');
    await expect(materialInput).toBeFocused({ timeout: 5000 });

    // second load attempt — should be blocked by guard
    await materialInput.fill('PAN-SECOND-PACK');
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill('10008-L');
    await slotInput.press('Enter');

    await expectLatestMessage(page, 'error-message', /已有上料條碼.*S5566/);

    const row = page.locator('[row-id="10008-L"]');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText('PAN-INIT-PACK');
});

test('panasonic detail: unload clears 當前上料條碼 only, re-scan updates it', async ({ page }, testInfo) => {
    const mockMounterFile = {
        file_name: 'test', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
        product_idno: '40Y85-010A-M3', product_ver: '1',
        mounter_idno: 'A1-NPM-W2', board_side: 'DUPLEX',
        panasonic_mounter_file_items: [
            { id: 1, slot_idno: '10008', sub_slot_idno: 'L', smd_model_idno: 'TEST-MAT', feeder_idno: 'F1', smd_description: 'Test', smd_quantity: 1 },
        ],
    };
    await page.route('**/smt/panasonic_mounter/A1-NPM-W2/ZZ9999', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMounterFile) })
    );

    await page.goto('http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3&mock_scan=1');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = getMainMaterialInput(page);
    const slotInput = getMainSlotInput(page);
    const row = page.locator('[row-id="10008-L"]');

    // initial load — both columns get set
    await materialInput.fill('PAN-INIT-PACK');
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill('10008-L');
    await slotInput.press('Enter');
    await expect(materialInput).toBeFocused({ timeout: 5000 });

    await expect(row.locator('[col-id="materialInventoryIdno"]')).toContainText('PAN-INIT-PACK');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText('PAN-INIT-PACK');

    // enter unload mode via S5555
    await materialInput.fill('S5555');
    await materialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);

    const unloadMaterialInput = page.locator('#detail-unload-material-input');
    await expect(unloadMaterialInput).toBeVisible({ timeout: 5000 });

    // unload the pack code
    await unloadMaterialInput.fill('PAN-INIT-PACK');
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(row.locator('[col-id="correct"]')).toContainText('⛔', { timeout: 5000 });

    // materialInventoryIdno preserved, appendedMaterialInventoryIdno cleared
    await expect(row.locator('[col-id="materialInventoryIdno"]')).toContainText('PAN-INIT-PACK');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).not.toContainText('PAN-INIT-PACK');

    // exit unload mode
    await page.getByRole('button', { name: /退出/ }).click();
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(unloadMaterialInput).not.toBeVisible();

    // re-scan after unload
    await materialInput.fill('PAN-RELOAD-PACK');
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill('10008-L');
    await slotInput.press('Enter');
    await expect(materialInput).toBeFocused({ timeout: 5000 });

    // materialInventoryIdno preserved, appendedMaterialInventoryIdno updated
    await expect(row.locator('[col-id="materialInventoryIdno"]')).toContainText('PAN-INIT-PACK');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText('PAN-RELOAD-PACK');
});

// ─── Duplicate scan detection ────────────────────────────────────────────────

test('panasonic detail: 重複掃描同一條碼顯示錯誤訊息', async ({ page }) => {
    const PANASONIC_NORMAL_URL = 'http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3&mock_scan=1';
    await page.goto(PANASONIC_NORMAL_URL);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = getMainMaterialInput(page);
    const slotInput = getMainSlotInput(page);

    // First scan — should succeed
    await materialInput.fill('B4933598');
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill('10009-L');
    await slotInput.press('Enter');
    await expect(materialInput).toBeFocused({ timeout: 5000 });

    // Second scan of same barcode — should trigger duplicate error
    await materialInput.fill('B4933598');
    await materialInput.press('Enter');

    await expectLatestMessage(page, 'error-message', '重複掃描');
    await expect(materialInput).toHaveValue('');
});

// ─── IPQC column visibility ───────────────────────────────────────────────────

test('panasonic detail: 進入 IPQC 模式後隱藏上料欄位、顯示覆檢欄位', async ({ page }) => {
    const PANASONIC_NORMAL_URL = 'http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3&mock_scan=1';
    await page.goto(PANASONIC_NORMAL_URL);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = getMainMaterialInput(page);

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

test('panasonic detail: 退出 IPQC 模式後欄位恢復原狀', async ({ page }) => {
    const PANASONIC_NORMAL_URL = 'http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3&mock_scan=1';
    await page.goto(PANASONIC_NORMAL_URL);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = getMainMaterialInput(page);

    // Enter IPQC mode
    await materialInput.fill('S5588');
    await materialInput.press('Enter');
    await expect(page.locator('#detail-ipqc-material-input')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.ag-header-cell[col-id="inspectMaterialPackCode"]')).toBeVisible();

    // Exit IPQC mode via the exit button
    await page.getByRole('button', { name: /退出.*IPQC/ }).click();

    // Verify we're back to normal mode: IPQC input replaced by normal input
    await expect(getMainMaterialInput(page)).toBeVisible({ timeout: 5000 });

    // Normal columns should be restored
    await expect(page.locator('.ag-header-cell[col-id="materialInventoryIdno"]')).toBeVisible();

    // IPQC columns should be hidden again
    await expect(page.locator('.ag-header-cell[col-id="inspectMaterialPackCode"]')).not.toBeVisible();
});

// ─── Production page: appendedMaterialInventoryIdno on initial load ────────────

test('panasonic production: 生產頁面初次載入時，當前上料條碼顯示初始上料條碼', async ({ page }) => {
    const productionUuid = 'appended-imported-pack-initial-load';
    const now = new Date().toISOString();

    const mockStats = [{
        id: 1, work_order_no: 'ZZ9999', product_idno: '40Y85-010A-M3',
        machine_idno: 'A1-NPM-W2', machine_side: 'FRONT', board_side: 'DUPLEX',
        slot_idno: '10008', sub_slot_idno: 'L', material_idno: 'TEST-MAT',
        production_end: null, produce_mode: 'NORMAL_PRODUCE_MODE',
        feed_records: [
            { id: 1000, feed_record_id: 1000, operation_time: now,
                material_pack_code: 'IMP-INIT-1',
                feed_material_pack_type: 'IMPORTED_MATERIAL_PACK',
                operation_type: 'FEED',
                check_pack_code_match: 'MATCHED_MATERIAL_PACK' },
        ],
    }];

    await page.route(`**/smt/panasonic_mounter_item/stats/${productionUuid}`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStats) })
    );
    await page.route(`**/smt/panasonic_mounter_item/stats/logs/${productionUuid}`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    await page.goto(`http://localhost/smt/panasonic-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const row = page.locator('[row-id="10008-L"]');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText('IMP-INIT-1');
    await expect(row.locator('[col-id="materialInventoryIdno"]')).toContainText('IMP-INIT-1');
    await expect(row.locator('[col-id="spliceMaterialInventoryIdno"]')).toBeEmpty();
});

test('panasonic production: 生產頁面載入時，主料與接料條碼分欄顯示', async ({ page }) => {
    const productionUuid = 'panasonic-active-splice-production-row';
    const now = new Date().toISOString();
    const later = new Date(Date.now() + 1_000).toISOString();

    const mockStats = [{
        id: 1, work_order_no: 'ZZ9999', product_idno: '40Y85-010A-M3',
        machine_idno: 'A1-NPM-W2', machine_side: 'FRONT', board_side: 'DUPLEX',
        slot_idno: '10008', sub_slot_idno: 'L', material_idno: 'TEST-MAT',
        production_end: null, produce_mode: 'NORMAL_PRODUCE_MODE',
        feed_records: [
            { id: 1000, feed_record_id: 1000, operation_time: now,
                material_pack_code: 'PAN-FIRST-PACK',
                feed_material_pack_type: 'IMPORTED_MATERIAL_PACK',
                operation_type: 'FEED',
                check_pack_code_match: 'MATCHED_MATERIAL_PACK' },
            { id: 1001, feed_record_id: 1001, operation_time: later,
                material_pack_code: 'PAN-SPLICE-PACK',
                feed_material_pack_type: 'NEW_MATERIAL_PACK',
                operation_type: 'FEED',
                check_pack_code_match: 'MATCHED_MATERIAL_PACK' },
        ],
    }];

    await page.route(`**/smt/panasonic_mounter_item/stats/${productionUuid}`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStats) })
    );
    await page.route(`**/smt/panasonic_mounter_item/stats/logs/${productionUuid}`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    await page.goto(`http://localhost/smt/panasonic-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const row = page.locator('[row-id="10008-L"]');
    await expect(row.locator('[col-id="materialInventoryIdno"]')).toContainText('PAN-FIRST-PACK');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText('PAN-FIRST-PACK');
    await expect(row.locator('[col-id="spliceMaterialInventoryIdno"]')).toContainText('PAN-SPLICE-PACK');
});

// ─── Production page: materialInventoryIdno preserved after unload ─────────────

test('panasonic production: 生產頁面載入時，首次接料條碼在卸料後仍保留', async ({ page }) => {
    const productionUuid = 'materialInventoryIdno-preserved-panasonic-prod';
    const now = new Date().toISOString();
    const later = new Date(Date.now() + 1_000).toISOString();

    const mockStats = [{
        id: 1, work_order_no: 'ZZ9999', product_idno: '40Y85-010A-M3',
        machine_idno: 'A1-NPM-W2', machine_side: 'FRONT', board_side: 'DUPLEX',
        slot_idno: '10008', sub_slot_idno: 'L', material_idno: 'TEST-MAT',
        production_end: null, produce_mode: 'NORMAL_PRODUCE_MODE',
        feed_records: [
            { id: 1000, feed_record_id: 1000, operation_time: now,
                material_pack_code: 'PAN-FIRST-PACK',
                feed_material_pack_type: 'IMPORTED_MATERIAL_PACK',
                operation_type: 'FEED',
                check_pack_code_match: 'MATCHED_MATERIAL_PACK' },
            { id: 1001, feed_record_id: 1001, operation_time: later,
                material_pack_code: 'PAN-FIRST-PACK',
                feed_material_pack_type: null,
                operation_type: 'UNFEED' },
        ],
    }];

    await page.route(`**/smt/panasonic_mounter_item/stats/${productionUuid}`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStats) })
    );
    await page.route(`**/smt/panasonic_mounter_item/stats/logs/${productionUuid}`, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    await page.goto(`http://localhost/smt/panasonic-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const row = page.locator('[row-id="10008-L"]');
    await expect(row.locator('[col-id="materialInventoryIdno"]')).toContainText('PAN-FIRST-PACK');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).not.toContainText('PAN-FIRST-PACK');
});

