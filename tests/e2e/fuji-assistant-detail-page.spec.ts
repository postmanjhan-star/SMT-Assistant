import { test, expect, Page } from '@playwright/test';
import { setupAuthToken } from './helpers/auth';
import { readCsvRecords, expectLatestMessage, type ScanRecord } from './helpers/scan';
import { waitVisualStepIfNeeded, waitForSlotFocus } from './helpers/pageActions';
import { DetailPage, MACHINE_URLS } from './pages/DetailPage';

const FUJI_NORMAL_URL = MACHINE_URLS.fuji.normal;
const FUJI_TESTING_URL = MACHINE_URLS.fuji.testing;

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    await setupAuthToken(page);
});

const scanOne = (page: Page, mat: string, slot: string) => new DetailPage(page, 'fuji').scanOne(mat, slot);
const scanAll = (page: Page, records: ScanRecord[]) => new DetailPage(page, 'fuji').scanAll(records);
const scanAllIpqc = (page: Page, records: ScanRecord[]) => new DetailPage(page, 'fuji').scanAllIpqc(records);

test('test scan fuji mounter feed records in normal mode', async ({ page }) => {
    test.setTimeout(300000);

    const records = readCsvRecords('tests/e2e/data/fuji_mounter_feed_records.csv');
    console.log(`共載入 ${records.length} 筆資料`);

    await page.goto(FUJI_NORMAL_URL + '&mock_scan=1');

    await scanAll(page, records);

    const firstRowCell = page
        .locator('.ag-center-cols-container .ag-row')
        .first()
        .locator(".ag-cell[col-id='materialInventoryIdno']");
    await expect(firstRowCell).toBeVisible();
    console.log('綁定結果:', await firstRowCell.innerText());

    await page.waitForURL(/\/smt\/fuji-mounter-production\/.+/, {
        timeout: 300000,
    });

    // 確認 production 頁初次載入時「當前上料條碼」不為空（初始上料條碼應顯示）
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();
    const firstProductionRow = page.locator('.ag-center-cols-container .ag-row').first();
    await expect(firstProductionRow.locator('[col-id="appendedMaterialInventoryIdno"]')).not.toBeEmpty();

    // 輸入 S5588 進入 IPQC 巡檢模式
    const productionMaterialInput = page.locator('.n-input input').first();
    await expect(productionMaterialInput).toBeVisible();
    await productionMaterialInput.click();
    await productionMaterialInput.fill('S5588');
    await page.waitForTimeout(300);
    await productionMaterialInput.press('Enter');
    await expect(page.locator('#fuji-ipqc-material-input')).toBeVisible({ timeout: 10000 });
    console.log('已進入 IPQC 巡檢模式');

    // 第二次掃描（IPQC 巡檢模式）
    await scanAllIpqc(page, records);
    console.log('Playwright 已完成完整掃描流程測試');
});

test('test scan fuji mounter feed records in testing mode', async ({ page }) => {
    test.setTimeout(300000);

    const startProductionRequests: any[] = [];

    await page.route('**/smt/fuji_mounter_item/stats', async (route) => {
        const request = route.request();
        if (request.method() !== 'POST') return route.continue();

        let body: any = null;
        try {
            body = request.postDataJSON();
        } catch {
            body = null;
        }

        if (body) {
            startProductionRequests.push(body);
        }

        return route.continue();
    });

    const records = readCsvRecords('tests/e2e/data/fuji_mounter_feed_records.csv');
    console.log(`總共 ${records.length} 筆資料`);

    await page.goto(FUJI_TESTING_URL + '&mock_scan=1');

    await scanAll(page, records);

    const startBtn = page.getByRole('button', { name: /開始生產/ });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    const confirmBtn = page.getByRole('button', { name: '確定' });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    await expect
        .poll(() => startProductionRequests.length)
        .toBeGreaterThan(0);
    const startPayload = startProductionRequests[startProductionRequests.length - 1];
    expect(Array.isArray(startPayload)).toBe(true);
    expect(startPayload.length).toBeGreaterThan(0);
    expect(
        startPayload.every(
            (item: any) =>
                item?.feed_material_pack_type === 'IMPORTED_MATERIAL_PACK' &&
                item?.operation_type === 'FEED'
        )
    ).toBe(true);

    await page.waitForURL(/\/smt\/fuji-mounter-production\/.+/, {
        timeout: 300000,
    });

    await expect(page.locator('.ag-root-wrapper')).toBeVisible();
});

test('test scan fuji mounter feed records in testing mode and append after production', async ({ page }) => {
    test.setTimeout(300000);

    const testingMaterialPack = 'test_material_pack_fuji';
    const appendRequests: any[] = [];

    await page.route('**/smt/material_inventory/*', (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith(`/smt/material_inventory/${testingMaterialPack}`)) {
            return route.fulfill({
                status: 404,
                contentType: 'application/json',
                body: JSON.stringify({ detail: 'Not Found' }),
            });
        }
        return route.continue();
    });

    await page.route('**/smt/fuji_mounter_item/stat/roll', async (route) => {
        const request = route.request();
        if (request.method() !== 'POST') return route.continue();

        let body: any = null;
        try {
            body = request.postDataJSON();
        } catch {
            body = null;
        }

        if (body) {
            appendRequests.push(body);
        }

        if (body?.material_pack_code === testingMaterialPack) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({}),
            });
        }

        return route.continue();
    });

    const records = readCsvRecords('tests/e2e/data/fuji_mounter_feed_records.csv');
    await page.goto(FUJI_TESTING_URL + '&mock_scan=1');
    await scanAll(page, records);

    const startBtn = page.getByRole('button', { name: /開始生產/ });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    const confirmBtn = page.getByRole('button', { name: '確定' });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    await page.waitForURL(/\/smt\/fuji-mounter-production\/.+/, {
        timeout: 300000,
    });

    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    // 槽位 9-A 已有 pre-production 接料（B4933598），必須先卸料再接料
    const existingMaterialPack = 'B4933598';
    const testingSlot = 'XP2B1-A-9';

    // Step 1: 進入卸料模式（掃 S5555 到物料條碼輸入框）
    const materialInput = page.locator('.n-input input').first();
    await expect(materialInput).toBeVisible();
    await materialInput.fill('S5555');
    await materialInput.press('Enter');

    // Step 2: 等待卸料模式 UI 出現
    const unloadMaterialInput = page.getByTestId('fuji-unload-material-input');
    await expect(unloadMaterialInput).toBeVisible({ timeout: 5000 });

    // Step 3: 掃描要卸除的捲號（自動定位站位 9-A）
    await unloadMaterialInput.fill(existingMaterialPack);
    await unloadMaterialInput.press('Enter');

    // Step 4: 等待卸料 API 完成（輸入框清空 → 進入更換捲號階段）
    await expect(unloadMaterialInput).toHaveValue('', { timeout: 10000 });

    // Step 5: 掃描更換捲號（testing mode + mock_scan=1 跳過驗證）
    await unloadMaterialInput.fill(testingMaterialPack);
    await unloadMaterialInput.press('Enter');

    // Step 6: 等待站位確認輸入框啟用（進入 replace_slot 階段）
    const unloadSlotInput = page.getByTestId('fuji-unload-slot-input');
    await expect(unloadSlotInput).toBeEnabled({ timeout: 5000 });

    // Step 7: 確認更換站位
    await unloadSlotInput.fill(testingSlot);
    await unloadSlotInput.press('Enter');

    const row = page.locator('[row-id="9-A"]');
    await expect(
        row.locator('[col-id="appendedMaterialInventoryIdno"]')
    ).toContainText(testingMaterialPack, { timeout: 15000 });

    await expect
        .poll(() => appendRequests.length)
        .toBeGreaterThan(0);
    expect(
        appendRequests.some(
            (payload) => payload?.material_pack_code === testingMaterialPack
        )
    ).toBe(true);
});

test('test testing mode quick virtual materials then append after production', async ({ page }) => {
    test.setTimeout(300000);

    const preProductionMaterials = ['virtual-pack-fuji-1', 'virtual-pack-fuji-2'];
    const postProductionMaterial = 'virtual-pack-fuji-3';
    const allVirtualMaterials = [...preProductionMaterials, postProductionMaterial];
    const appendRequests: any[] = [];

    await page.route('**/smt/material_inventory/*', (route) => {
        const url = new URL(route.request().url());
        const isVirtual = allVirtualMaterials.some((code) =>
            url.pathname.endsWith(`/smt/material_inventory/${code}`)
        );

        if (isVirtual) {
            return route.fulfill({
                status: 404,
                contentType: 'application/json',
                body: JSON.stringify({ detail: 'Not Found' }),
            });
        }

        return route.continue();
    });

    await page.route('**/smt/fuji_mounter_item/stat/roll', async (route) => {
        const request = route.request();
        if (request.method() !== 'POST') return route.continue();

        let body: any = null;
        try {
            body = request.postDataJSON();
        } catch {
            body = null;
        }

        if (body) {
            appendRequests.push(body);
        }

        if (allVirtualMaterials.includes(body?.material_pack_code)) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({}),
            });
        }

        return route.continue();
    });

    await page.goto(FUJI_TESTING_URL + '&mock_scan=1');
    await scanOne(page, preProductionMaterials[0], 'XP2B1-A-9');
    await scanOne(page, preProductionMaterials[1], 'XP2B1-B-9');

    const startBtn = page.getByRole('button', { name: /開始生產/ });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    const confirmBtn = page.getByRole('button', { name: '確定' });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    await page.waitForURL(/\/smt\/fuji-mounter-production\/.+/, {
        timeout: 300000,
    });

    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    // 槽位 9-A 已有 pre-production 接料（virtual-pack-fuji-1），必須先卸料再接料
    const targetSlot = 'XP2B1-A-9';
    const existingPack = preProductionMaterials[0]; // 'virtual-pack-fuji-1'

    // Step 1: 進入卸料模式
    const materialInput = page.locator('.n-input input').first();
    await expect(materialInput).toBeVisible();
    await materialInput.fill('S5555');
    await materialInput.press('Enter');

    // Step 2: 等待卸料模式 UI 出現
    const unloadMaterialInput = page.getByTestId('fuji-unload-material-input');
    await expect(unloadMaterialInput).toBeVisible({ timeout: 5000 });

    // Step 3: 掃描要卸除的捲號（自動定位站位 9-A）
    await unloadMaterialInput.fill(existingPack);
    await unloadMaterialInput.press('Enter');

    // Step 4: 等待卸料 API 完成（輸入框清空 → 進入更換捲號階段）
    await expect(unloadMaterialInput).toHaveValue('', { timeout: 10000 });

    // Step 5: 掃描更換捲號（testing mode + mock_scan=1 跳過驗證）
    await unloadMaterialInput.fill(postProductionMaterial);
    await unloadMaterialInput.press('Enter');

    // Step 6: 等待站位確認輸入框啟用（進入 replace_slot 階段）
    const unloadSlotInput = page.getByTestId('fuji-unload-slot-input');
    await expect(unloadSlotInput).toBeEnabled({ timeout: 5000 });

    // Step 7: 確認更換站位
    await unloadSlotInput.fill(targetSlot);
    await unloadSlotInput.press('Enter');

    const row = page.locator('[row-id="9-A"]');
    await expect(
        row.locator('[col-id="appendedMaterialInventoryIdno"]')
    ).toContainText(postProductionMaterial, { timeout: 15000 });

    await expect
        .poll(() => appendRequests.length)
        .toBeGreaterThan(0);
    expect(
        appendRequests.some(
            (payload) => payload?.material_pack_code === postProductionMaterial
        )
    ).toBe(true);
});

test('test wrong slot scan in normal mode', async ({ page }) => {
    // mock_scan=1 uses MockNormalModeStrategy which bypasses matchedRows and accepts any slot as ✅.
    // Instead, mock the mounter and material APIs so NormalModeStrategy runs with real slot matching.
    await page.route('**/smt/fuji_mounter/ZZ9999**', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
                mounter_idno: 'XP2B1',
                board_side: 'TOP',
                fuji_mounter_file_items: [
                    { stage: 'A', slot: 9,  part_number: 'TEST-MAT-B4933598' },
                    { stage: 'A', slot: 11, part_number: 'OTHER-MAT' },
                ],
            }]),
        })
    );
    await page.route('**/smt/material_inventory/B4933598**', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: 1,
                idno: 'B4933598',
                material_id: 1,
                material_idno: 'TEST-MAT-B4933598',
                material_name: 'Test Material B4933598',
            }),
        })
    );

    await page.goto(FUJI_NORMAL_URL);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialPackCode = 'B4933598';
    const correctSlot = 'XP2B1-A-9';
    const wrongSlot = 'XP2B1-A-11';

    const materialInput = page.getByTestId('fuji-detail-material-input').locator('input');

    // 1. scan material → wrong slot → ❌
    await scanOne(page, materialPackCode, wrongSlot);

    const wrongRow = page.locator(`[row-id="${wrongSlot}"]`);
    await expect(wrongRow.locator('[col-id="correct"]')).toContainText('\u274C');
    await expect(
        wrongRow.locator('[col-id="materialInventoryIdno"]')
    ).toContainText(materialPackCode);

    // 2. S5577 force-unload to clear the duplicate-scan guard
    //    (re-scanning directly is blocked because the barcode is still "in grid")
    await materialInput.fill('S5577');
    await materialInput.press('Enter');
    const unloadSlotInput = page.locator('#detail-unload-slot-input');
    await expect(unloadSlotInput).toBeFocused({ timeout: 5000 });
    await unloadSlotInput.fill(wrongSlot);
    await unloadSlotInput.press('Enter');
    const unloadMaterialInput = page.locator('#detail-unload-material-input');
    await expect(unloadMaterialInput).toBeFocused({ timeout: 5000 });
    await unloadMaterialInput.fill('S5577');
    await unloadMaterialInput.press('Enter');

    // 3. re-scan to correct slot
    await scanOne(page, materialPackCode, correctSlot);

    // Verify wrong row is cleared, correct row updated
    await expect(
        wrongRow.locator('[col-id="materialInventoryIdno"]')
    ).not.toContainText(materialPackCode);
    await expect(wrongRow.locator('[col-id="correct"]')).not.toContainText('\u274C');

    const correctRow = page.locator(`[row-id="${correctSlot}"]`);
    await expect(
        correctRow.locator('[col-id="materialInventoryIdno"]')
    ).toContainText(materialPackCode);
    await expect(correctRow.locator('[col-id="correct"]')).toContainText('\u2705');

    console.log('done: wrong slot cleared and correct slot updated');
});

test('test wrong slot scan in testing mode', async ({ page }) => {
    await page.goto(FUJI_TESTING_URL + '&mock_scan=1');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialPackCode = 'B4933598';
    const correctSlot = 'XP2B1-A-9';
    const wrongSlot = 'XP2B1-A-11';

    await scanOne(page, materialPackCode, wrongSlot);

    const wrongRow = page.locator(`[row-id="${wrongSlot}"]`);
    await expect(wrongRow.locator('[col-id="correct"]')).toContainText('\u274C');
    await expect(
        wrongRow.locator('[col-id="materialInventoryIdno"]')
    ).toContainText(materialPackCode);

    await scanOne(page, materialPackCode, correctSlot);

    // Verify wrong row is cleared
    await expect(
        wrongRow.locator('[col-id="materialInventoryIdno"]')
    ).not.toContainText(materialPackCode);
    await expect(wrongRow.locator('[col-id="correct"]')).not.toContainText('\u274C');

    const correctRow = page.locator(`[row-id="${correctSlot}"]`);
    await expect(
        correctRow.locator('[col-id="materialInventoryIdno"]')
    ).toContainText(materialPackCode);
    await expect(correctRow.locator('[col-id="correct"]')).toContainText('\u2705');

    console.log('done: testing mode wrong slot cleared and correct slot updated');
});

test('test submit slot without material in normal mode', async ({ page }) => {
    await page.goto(FUJI_NORMAL_URL);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const slotInput = page.locator('.n-input input').nth(1);
    await slotInput.fill('XP2B1-A-9');
    await slotInput.press('Enter');

    await expectLatestMessage(page, 'error-message', '請先掃描物料條碼');
});

test('test invalid slot format in normal mode', async ({ page }) => {
    await page.goto(FUJI_NORMAL_URL + '&mock_scan=1');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.locator('.n-input input').first();
    await materialInput.fill('B4933598');
    await materialInput.press('Enter');

    await waitForSlotFocus(page, materialInput);
    const slotInput = page.locator('*:focus');
    await slotInput.fill('XP2B1-Z-9');
    await slotInput.press('Enter');

    await expectLatestMessage(page, 'error-message', '槽位格式錯誤');
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
    test(`test material scan shows shared ERP error (${errorCase.label}) in fuji detail page`, async ({ page }, testInfo) => {
        const unreachableMaterial = `erp-error-fuji-detail-${errorCase.status}`;

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

        await page.goto(FUJI_NORMAL_URL);
        await expect(page.locator('.ag-root-wrapper')).toBeVisible();

        const materialInput = page.getByTestId('fuji-detail-material-input').locator('input');
        const slotInput = page.getByTestId('fuji-detail-slot-input').locator('input');
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
    test(`test material scan shows shared ERP error (${errorCase.label}) in fuji production page`, async ({ page }, testInfo) => {
        const productionUuid = `erp-error-fuji-production-${errorCase.status}`;
        const unreachableMaterial = `erp-error-fuji-production-${errorCase.status}`;
        const now = new Date().toISOString();

        const mockStats = [
            {
                id: 1,
                work_order_no: 'ZZ9999',
                product_idno: '40X85-009B-TEST_SCAN',
                machine_idno: 'XP2B1',
                machine_side: 'FRONT',
                board_side: 'TOP',
                slot_idno: '9',
                sub_slot_idno: 'A',
                material_idno: 'MAT-1',
                production_end: null,
                produce_mode: 'NORMAL_PRODUCE_MODE',
                feed_records: [
                    {
                        id: 1000,
                        feed_record_id: 1000,
                        operation_time: now,
                        material_pack_code: 'MAIN-1',
                        feed_material_pack_type: 'IMPORTED_MATERIAL_PACK',
                        check_pack_code_match: 'MATCHED_MATERIAL_PACK',
                    },
                ],
            },
        ];

        await page.route(`**/smt/fuji_mounter_item/stats/${productionUuid}`, (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockStats),
            })
        );

        await page.route(`**/smt/fuji_mounter_item/stats/logs/${productionUuid}`, (route) =>
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

        await page.goto(`http://localhost/smt/fuji-mounter-production/${productionUuid}`);
        await expect(page.locator('.ag-root-wrapper')).toBeVisible();

        const materialInput = page.getByTestId('fuji-production-material-input').locator('input');
        const slotInput = page.getByTestId('fuji-production-slot-input').locator('input');
        await materialInput.fill(unreachableMaterial);
        await materialInput.press('Enter');
        await waitVisualStepIfNeeded(page, testInfo);

        await expectLatestMessage(page, 'error-message', errorCase.expectedMessage);
        await expect(materialInput).toHaveValue('');
        await expect(materialInput).toBeFocused();
        await expect(slotInput).not.toBeFocused();
    });
}

test('test start production blocked when slots are not fully bound in normal mode', async ({ page }) => {
    await page.goto(FUJI_NORMAL_URL);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const startBtn = page.getByRole('button', { name: /開始生產/ });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    await expectLatestMessage(page, 'error-message', '尚有槽位未綁定，不能開始生產');
    await expect(page).toHaveURL(/\/smt\/fuji-mounter\/XP2B1\/ZZ9999/);
});

