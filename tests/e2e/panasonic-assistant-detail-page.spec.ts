import { test, expect, Page } from '@playwright/test';
import { setupAuthToken } from './helpers/auth';
import { readCsvRecords, expectLatestMessage, type ScanRecord } from './helpers/scan';
import { waitVisualStepIfNeeded } from './helpers/pageActions';
import { DetailPage } from './pages/DetailPage';

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    await setupAuthToken(page);
});

const getMainMaterialInput = (page: Page) => new DetailPage(page, 'panasonic').materialInput;
const getMainSlotInput = (page: Page) => new DetailPage(page, 'panasonic').slotInput;
const scanOne = (page: Page, mat: string, slot: string) => new DetailPage(page, 'panasonic').scanOne(mat, slot);
const scanAll = (page: Page, records: ScanRecord[]) => new DetailPage(page, 'panasonic').scanAll(records);
const scanAllIpqc = (page: Page, records: ScanRecord[]) => new DetailPage(page, 'panasonic').scanAllIpqc(records);
const expectMainScanInputsCleared = (page: Page) => new DetailPage(page, 'panasonic').expectMainScanInputsCleared();


test('test scan panasonic mounter feed records in normal mode', async ({ page }) => {

    test.setTimeout(300000);

    const startProductionRequests: any[] = [];

    await page.route('**/smt/panasonic_mounter_item/stats', async (route) => {
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

    const records = readCsvRecords('tests/e2e/data/panasonic_mounter_feed_records.csv');
    console.log(`loaded ${records.length} records`);

    await page.goto("http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3&mock_scan=1");

    // first scan pass
    await scanAll(page, records);

    const firstRowCell = page.locator(".ag-center-cols-container .ag-row").first().locator(".ag-cell[col-id='materialInventoryIdno']");
    await expect(firstRowCell).toBeVisible();
    console.log('first row binding result:', await firstRowCell.innerText());

    console.log('normal mode scan completed, triggering start production...');

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
                item?.operation_type === 'FEED' &&
                item?.produce_mode === 'NORMAL_PRODUCE_MODE'
        )
    ).toBe(true);

    
    await page.waitForURL(/\/smt\/panasonic-mounter-production\/.+/, { timeout: 300000 });
    console.log("page redirected, entering IPQC inspection mode...");

    // 輸入 S5588 進入 IPQC 巡檢模式
    const productionMaterialInput = page.getByTestId('panasonic-main-material-input').locator('input');
    await productionMaterialInput.fill('S5588');
    await productionMaterialInput.press('Enter');
    console.log('entered IPQC inspection mode, start second scan');

    // second scan pass on production page (IPQC mode)
    await scanAllIpqc(page, records);

    console.log("playwright full scan flow completed");
});

test('test scan panasonic mounter feed records in testing mode', async ({ page }) => {
    test.setTimeout(300000);

    const testingMaterialPack = 'test_material_pack';
    const appendRequests: any[] = [];
    const startProductionRequests: any[] = [];

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

    await page.route('**/smt/panasonic_mounter_item/stat/roll', async (route) => {
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

    await page.route('**/smt/panasonic_mounter_item/stats', async (route) => {
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

    const records = readCsvRecords('tests/e2e/data/panasonic_mounter_feed_records.csv');
    console.log(`loaded ${records.length} records`);

    await page.goto("http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3&testing_mode=1&testing_product_idno=40Y85-010A-M3&mock_scan=1");

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
                item?.operation_type === 'FEED' &&
                item?.produce_mode === 'TESTING_PRODUCE_MODE'
        )
    ).toBe(true);

    await page.waitForURL(/\/smt\/panasonic-mounter-production\/.+/, { timeout: 300000 });

    await expect(page.locator(".ag-root-wrapper")).toBeVisible();

    // 槽位 10008-L 已有 pre-production 接料（B4909892），必須先卸料再接料
    const existingMaterialPack = 'B4909892';
    const testingSlot = '10008-L';

    // Step 1: 進入卸料模式
    const materialInput = getMainMaterialInput(page);
    await expect(materialInput).toBeVisible();
    await materialInput.fill('S5555');
    await materialInput.press('Enter');

    // Step 2: 等待卸料模式 UI 出現
    const unloadMaterialInput = page.getByTestId('unload-material-input');
    await expect(unloadMaterialInput).toBeVisible({ timeout: 5000 });

    // Step 3: 掃描要卸除的捲號（自動定位站位 10008-L）
    await unloadMaterialInput.fill(existingMaterialPack);
    await unloadMaterialInput.press('Enter');

    // Step 4: 等待卸料 API 完成（輸入框清空 → 進入更換捲號階段）
    await expect(unloadMaterialInput).toHaveValue('', { timeout: 10000 });

    // Step 5: 掃描更換捲號（testing mode + mock_scan=1 跳過驗證）
    await unloadMaterialInput.fill(testingMaterialPack);
    await unloadMaterialInput.press('Enter');

    // Step 6: 等待站位確認輸入框啟用（進入 replace_slot 階段）
    const unloadSlotInput = page.getByTestId('unload-slot-input');
    await expect(unloadSlotInput).toBeEnabled({ timeout: 5000 });

    // Step 7: 確認更換站位
    await unloadSlotInput.fill(testingSlot);
    await unloadSlotInput.press('Enter');

    const row = page.locator(`[row-id="${testingSlot}"]`);
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

    const preProductionMaterials = ['virtual-pack-1', 'virtual-pack-2'];
    const postProductionMaterial = 'virtual-pack-3';
    const allVirtualMaterials = [...preProductionMaterials, postProductionMaterial];
    const appendRequests: any[] = [];
    const startProductionRequests: any[] = [];

    await page.route('**/smt/material_inventory/*', (route) => {
        const url = new URL(route.request().url());
        const isVirtual = allVirtualMaterials.some(code =>
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

    await page.route('**/smt/panasonic_mounter_item/stat/roll', async (route) => {
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

    await page.goto("http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3&testing_mode=1&testing_product_idno=40Y85-010A-M3&mock_scan=1");

    await scanOne(page, preProductionMaterials[0], '10008-L');
    await scanOne(page, preProductionMaterials[1], '10009-R');

    const startBtn = page.getByRole('button', { name: /開始生產/ });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    const confirmBtn = page.getByRole('button', { name: '確定' });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    await page.waitForURL(/\/smt\/panasonic-mounter-production\/.+/, { timeout: 300000 });

    await expect(page.locator(".ag-root-wrapper")).toBeVisible();

    // 槽位 10008-L 已有 pre-production 接料（virtual-pack-1），必須先卸料再接料
    const targetSlot = '10008-L';
    const existingPack = preProductionMaterials[0]; // 'virtual-pack-1'

    // Step 1: 進入卸料模式
    const materialInput = getMainMaterialInput(page);
    await expect(materialInput).toBeVisible();
    await materialInput.fill('S5555');
    await materialInput.press('Enter');

    // Step 2: 等待卸料模式 UI 出現
    const unloadMaterialInput = page.getByTestId('unload-material-input');
    await expect(unloadMaterialInput).toBeVisible({ timeout: 5000 });

    // Step 3: 掃描要卸除的捲號（自動定位站位 10008-L）
    await unloadMaterialInput.fill(existingPack);
    await unloadMaterialInput.press('Enter');

    // Step 4: 等待卸料 API 完成（輸入框清空 → 進入更換捲號階段）
    await expect(unloadMaterialInput).toHaveValue('', { timeout: 10000 });

    // Step 5: 掃描更換捲號（testing mode + mock_scan=1 跳過驗證）
    await unloadMaterialInput.fill(postProductionMaterial);
    await unloadMaterialInput.press('Enter');

    // Step 6: 等待站位確認輸入框啟用（進入 replace_slot 階段）
    const unloadSlotInput = page.getByTestId('unload-slot-input');
    await expect(unloadSlotInput).toBeEnabled({ timeout: 5000 });

    // Step 7: 確認更換站位
    await unloadSlotInput.fill(targetSlot);
    await unloadSlotInput.press('Enter');

    const row = page.locator(`[row-id="${targetSlot}"]`);
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
    // Instead, mock the material inventory endpoint so NormalModeStrategy runs with real slot matching.
    await page.route('**/smt/panasonic_mounter/A1-NPM-W2/ZZ9999**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                file_name: 'mock.csv',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
                product_idno: '40Y85-010A-M3',
                product_ver: '1',
                mounter_idno: 'A1-NPM-W2',
                panasonic_mounter_file_items: [
                    { slot_idno: '10008', sub_slot_idno: 'L', smd_model_idno: 'TEST-MAT-B4909892', feeder_idno: '10008-L', smd_description: 'mock correct slot' },
                    { slot_idno: '10009', sub_slot_idno: 'R', smd_model_idno: 'OTHER-MAT', feeder_idno: '10009-R', smd_description: 'mock wrong slot' },
                ],
            }),
        });
    });

    await page.route(`**/smt/material_inventory/B4909892**`, (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: 1,
                idno: 'B4909892',
                material_id: 1,
                material_idno: 'TEST-MAT-B4909892',
                material_name: 'Test Material B4909892',
            }),
        });
    });

    await page.goto("http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3");

    await expect(page.locator(".ag-root-wrapper")).toBeVisible();

    const materialPackCode = 'B4909892';
    const correctSlot = '10008-L';
    const wrongSlot = '10009-R';

    const materialInput = getMainMaterialInput(page);
    const slotInput = getMainSlotInput(page);
    await materialInput.fill(materialPackCode);
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill(wrongSlot);
    await slotInput.press('Enter');

    // await expect(
    //     page.getByTestId('error-message')

    const row = page.locator(`[row-id="${wrongSlot}"]`);
    await expect(row.locator('[col-id="correct"]')).toContainText('❌');
    await expect(row.locator('[col-id="materialInventoryIdno"]')).toContainText(materialPackCode);

    // 7. force-unload the wrongly bound barcode so it's no longer "in grid"
    //    (re-scanning directly is blocked by the duplicate-scan guard)
    await materialInput.fill('S5577');
    await materialInput.press('Enter');
    const unloadSlotInput = page.locator('#detail-unload-slot-input');
    await expect(unloadSlotInput).toBeFocused({ timeout: 5000 });
    await unloadSlotInput.fill(wrongSlot);
    await unloadSlotInput.press('Enter');
    // exit force-unload mode (scan S5577 again in unload material input)
    const unloadMaterialInput = page.locator('#detail-unload-material-input');
    await expect(unloadMaterialInput).toBeFocused({ timeout: 5000 });
    await unloadMaterialInput.fill('S5577');
    await unloadMaterialInput.press('Enter');

    // 8. scan again with correct slot
    await materialInput.fill(materialPackCode);
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill(correctSlot);
    await slotInput.press('Enter');

    // 8. wrong slot should be cleared, correct slot should be updated
    const wrongRow = page.locator(`[row-id="${wrongSlot}"]`);
    await expect(
        wrongRow.locator('[col-id="materialInventoryIdno"]')
    ).not.toContainText(materialPackCode);
    await expect(
        wrongRow.locator('[col-id="correct"]')
    ).not.toContainText('❌');

    const correctRow = page.locator(`[row-id="${correctSlot}"]`);
    await expect(
        correctRow.locator('[col-id="materialInventoryIdno"]')
    ).toContainText(materialPackCode);

    console.log("done: wrong slot cleared and correct slot updated");
});

test('test wrong material with S5555 換料卸除 then re-scan to correct slot', async ({ page }) => {
    // Same grid/material mocks as the wrong-slot test
    await page.route('**/smt/panasonic_mounter/A1-NPM-W2/ZZ9999**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                file_name: 'mock.csv',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
                product_idno: '40Y85-010A-M3',
                product_ver: '1',
                mounter_idno: 'A1-NPM-W2',
                panasonic_mounter_file_items: [
                    { slot_idno: '10008', sub_slot_idno: 'L', smd_model_idno: 'TEST-MAT-B4909892', feeder_idno: '10008-L', smd_description: 'mock correct slot' },
                    { slot_idno: '10009', sub_slot_idno: 'R', smd_model_idno: 'OTHER-MAT', feeder_idno: '10009-R', smd_description: 'mock wrong slot' },
                ],
            }),
        });
    });

    await page.route('**/smt/material_inventory/B4909892**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: 1,
                idno: 'B4909892',
                material_id: 1,
                material_idno: 'TEST-MAT-B4909892',
                material_name: 'Test Material B4909892',
            }),
        });
    });

    await page.goto("http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3");
    await expect(page.locator(".ag-root-wrapper")).toBeVisible();

    const materialPackCode = 'B4909892';
    const correctSlot = '10008-L';
    const wrongSlot = '10009-R';

    const materialInput = getMainMaterialInput(page);
    const slotInput = getMainSlotInput(page);

    // 1. scan material → wrong slot → ❌
    await materialInput.fill(materialPackCode);
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill(wrongSlot);
    await slotInput.press('Enter');

    await expect(page.locator(`[row-id="${wrongSlot}"]`).locator('[col-id="correct"]')).toContainText('❌');
    await expect(page.locator(`[row-id="${wrongSlot}"]`).locator('[col-id="materialInventoryIdno"]')).toContainText(materialPackCode);

    // 2. S5555 換料卸除: scan material barcode, system auto-finds the wrong slot
    //    (unlike S5577 which requires scanning the slot directly)
    await materialInput.fill('S5555');
    await materialInput.press('Enter');
    const unloadMaterialInput = page.locator('#detail-unload-material-input');
    await expect(unloadMaterialInput).toBeFocused({ timeout: 5000 });
    await unloadMaterialInput.fill(materialPackCode);
    await unloadMaterialInput.press('Enter');
    // system finds 10009-R, unloads it, transitions to REPLACE_MATERIAL_SCAN

    // 3. exit unload mode without replacement (scan S5555 again)
    await expect(unloadMaterialInput).toBeFocused({ timeout: 5000 });
    await unloadMaterialInput.fill('S5555');
    await unloadMaterialInput.press('Enter');

    // 4. re-scan to the correct slot
    await materialInput.fill(materialPackCode);
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill(correctSlot);
    await slotInput.press('Enter');

    // 5. wrong slot should be cleared, correct slot should be updated
    await expect(
        page.locator(`[row-id="${wrongSlot}"]`).locator('[col-id="materialInventoryIdno"]')
    ).not.toContainText(materialPackCode);
    await expect(
        page.locator(`[row-id="${wrongSlot}"]`).locator('[col-id="correct"]')
    ).not.toContainText('❌');
    await expect(
        page.locator(`[row-id="${correctSlot}"]`).locator('[col-id="materialInventoryIdno"]')
    ).toContainText(materialPackCode);

    console.log("done: S5555 換料卸除 and re-scan to correct slot");
});

test('test wrong slot scan in testing mode', async ({ page }) => {
    await page.route('**/smt/panasonic_mounter/A1-NPM-W2/ZZ9999**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                file_name: 'mock.csv',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
                product_idno: '40Y85-010A-M3',
                product_ver: '1',
                mounter_idno: 'A1-NPM-W2',
                panasonic_mounter_file_items: [
                    { slot_idno: '10008', sub_slot_idno: 'L', smd_model_idno: 'TEST-MAT-B4909892', feeder_idno: '10008-L', smd_description: 'mock correct slot' },
                    { slot_idno: '10009', sub_slot_idno: 'R', smd_model_idno: 'OTHER-MAT', feeder_idno: '10009-R', smd_description: 'mock wrong slot' },
                ],
            }),
        });
    });

    await page.route('**/smt/material_inventory/B4909892**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: 1,
                idno: 'B4909892',
                material_id: 1,
                material_idno: 'TEST-MAT-B4909892',
                material_name: 'Test Material B4909892',
            }),
        });
    });

    await page.goto("http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3&testing_mode=1&testing_product_idno=40Y85-010A-M3");
    await expect(page.locator(".ag-root-wrapper")).toBeVisible();

    const materialPackCode = 'B4909892';
    const correctSlot = '10008-L';
    const wrongSlot = '10009-R';

    const materialInput = getMainMaterialInput(page);
    const slotInput = getMainSlotInput(page);
    await materialInput.fill(materialPackCode);
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill(wrongSlot);
    await slotInput.press('Enter');

    const row = page.locator(`[row-id="${wrongSlot}"]`);
    await expect(row.locator('[col-id="correct"]')).toContainText('❌');
    await expect(row.locator('[col-id="materialInventoryIdno"]')).toContainText(materialPackCode);

    // force-unload to clear the duplicate-scan guard (same as normal mode)
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

    await materialInput.fill(materialPackCode);
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill(correctSlot);
    await slotInput.press('Enter');

    const wrongRow = page.locator(`[row-id="${wrongSlot}"]`);
    await expect(
        wrongRow.locator('[col-id="materialInventoryIdno"]')
    ).not.toContainText(materialPackCode);

    const correctRow = page.locator(`[row-id="${correctSlot}"]`);
    await expect(
        correctRow.locator('[col-id="materialInventoryIdno"]')
    ).toContainText(materialPackCode);
    await expect(correctRow.locator('[col-id="correct"]')).toContainText('\u2705');

    console.log("done: testing mode wrong slot cleared and correct slot updated");
});

test('test submit slot without material in normal mode', async ({ page }) => {
    await page.goto("http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3");
    await expect(page.locator(".ag-root-wrapper")).toBeVisible();

    const slotInput = getMainSlotInput(page);
    await slotInput.fill('10008-L');
    await slotInput.press('Enter');
    await expectMainScanInputsCleared(page);

    await expectLatestMessage(page, 'error-message', '請先掃描物料條碼');
});

test('test invalid slot format in normal mode', async ({ page }) => {
    await page.goto("http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3&mock_scan=1");
    await expect(page.locator(".ag-root-wrapper")).toBeVisible();

    const materialInput = getMainMaterialInput(page);
    const slotInput = getMainSlotInput(page);
    await materialInput.fill('B4909892');
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill('10008-L-EXTRA');
    await slotInput.press('Enter');
    await expectMainScanInputsCleared(page);

    await expectLatestMessage(page, 'error-message', '槽位格式錯誤');
});

test('test successful scan flow focuses slot then resets to material in panasonic detail page', async ({ page }) => {
    await page.goto("http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3&mock_scan=1");
    await expect(page.locator(".ag-root-wrapper")).toBeVisible();

    const materialInput = getMainMaterialInput(page);
    const slotInput = getMainSlotInput(page);
    await materialInput.fill('B4909892');
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });

    await slotInput.fill('10008-L');
    await slotInput.press('Enter');

    await expect(materialInput).toHaveValue('');
    await expect(slotInput).toHaveValue('');
    await expect(materialInput).toBeFocused();
});

test('test successful scan flow focuses slot then resets to material in panasonic production page', async ({ page }) => {
    const productionUuid = 'slot-reset-panasonic-production';
    const materialPackCode = 'SCAN-SUCCESS-1';
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
        if (url.pathname.endsWith(`/smt/material_inventory/${materialPackCode}`)) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 1,
                    idno: materialPackCode,
                    material_idno: '88120-0001-S0',
                    material_name: 'TEST-MATERIAL',
                }),
            });
        }
        return route.continue();
    });

    await page.route('**/smt/panasonic_mounter_item/stat/roll', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({}),
        })
    );

    await page.goto(`http://localhost/smt/panasonic-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = getMainMaterialInput(page);
    const slotInput = getMainSlotInput(page);
    await materialInput.fill(materialPackCode);
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });

    await slotInput.fill('10008-L');
    await slotInput.press('Enter');

    await expect(materialInput).toHaveValue('');
    await expect(slotInput).toHaveValue('');
    await expect(materialInput).toBeFocused();
});
