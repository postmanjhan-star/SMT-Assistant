import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Read Panasonic CSV scan records used by e2e flow.
 */
function readCsvRecords() {

    const csvPath = path.join(process.cwd(), 'tests/e2e/data/panasonic_mounter_feed_records.csv');

    if (!fs.existsSync(csvPath)) {
        console.warn(`CSV file not found at ${csvPath}, returning empty list.`);
        return [];
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const records: { material: string, slot: string }[] = [];

    for (const line of lines) {

        const parts = line.split(',');
        if (parts.length >= 2 && parts[0].trim()) {
            records.push({ material: parts[0].trim(), slot: parts[1].trim() });
        }
    }
    return records;
}

/**
 * Scan all records: material first, then slot.
 */
function getMainMaterialInput(page: Page) {
    return page.getByTestId('panasonic-main-material-input').locator('input');
}

function getMainSlotInput(page: Page) {
    return page.getByTestId('panasonic-main-slot-input').locator('input');
}

async function scanAll(page: Page, records: { material: string, slot: string }[]) {
    const materialInput = getMainMaterialInput(page);
    const slotInput = getMainSlotInput(page);

    for (const [index, record] of records.entries()) {
        console.log(`scan ${index + 1}/${records.length}: ${record.material}`);
        try {
            await expect(materialInput).toBeVisible();
            await expect(slotInput).toBeVisible();

            await materialInput.click();
            await materialInput.fill(record.material);
            await materialInput.press('Enter');
            await expect(slotInput).toBeFocused({ timeout: 10000 });
            await slotInput.fill(record.slot);
            await slotInput.press('Enter');

        } catch (e) {
            console.log(`skip record due timeout/error: ${record.material}`);

        }
    }
}

async function scanOne(page: Page, material: string, slot: string) {
    const materialInput = getMainMaterialInput(page);
    const slotInput = getMainSlotInput(page);
    await expect(materialInput).toBeVisible();
    await expect(slotInput).toBeVisible();

    await materialInput.click();
    await materialInput.fill(material);
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill(slot);
    await slotInput.press('Enter');
}

async function expectMainScanInputsCleared(page: Page) {
    await expect(getMainMaterialInput(page)).toHaveValue('');
    await expect(getMainSlotInput(page)).toHaveValue('');
}

async function expectLatestMessage(
    page: Page,
    testId: 'error-message' | 'warning-message' | 'info-message' | 'success-message',
    text: string | RegExp
) {
    const message = page.getByTestId(testId).last();
    await expect(message).toBeVisible();
    await expect(message).toContainText(text);
}

test('test scan panasonic mounter feed records in normal mode', async ({ page }) => {

    test.setTimeout(300000);

    const records = readCsvRecords();
    console.log(`loaded ${records.length} records`);

    await page.goto("http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3");

    // first scan pass
    await scanAll(page, records);

    const firstRowCell = page.locator(".ag-center-cols-container .ag-row").first().locator(".ag-cell[col-id='materialInventoryIdno']");
    await expect(firstRowCell).toBeVisible();
    console.log('first row binding result:', await firstRowCell.innerText());

    console.log('normal mode scan completed, waiting for production page redirect...');

    await page.waitForURL(/\/smt\/panasonic-mounter-production\/.+/, { timeout: 300000 });
    console.log("page redirected, start second scan");

    // second scan pass on production page
    await scanAll(page, records);

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

    const records = readCsvRecords();
    console.log(`loaded ${records.length} records`);

    await page.goto("http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3&testing_mode=1&testing_product_idno=40Y85-010A-M3");

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

    await page.waitForURL(/\/smt\/panasonic-mounter-production\/.+/, { timeout: 300000 });

    await expect(page.locator(".ag-root-wrapper")).toBeVisible();

    const testingSlot = '10008-L';

    const materialInput = getMainMaterialInput(page);
    const slotInput = getMainSlotInput(page);
    await materialInput.fill(testingMaterialPack);
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill(testingSlot);
    await slotInput.press('Enter');

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

    await page.goto("http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3&testing_mode=1&testing_product_idno=40Y85-010A-M3");

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
    await scanOne(page, postProductionMaterial, '10008-L');

    const row = page.locator(`[row-id="10008-L"]`);
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

    // 7. scan again with correct slot
    await materialInput.fill(materialPackCode);
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    const slotInputAfter = slotInput;
    await slotInputAfter.fill(correctSlot);
    await slotInputAfter.press('Enter');

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

test('test wrong slot scan in testing mode', async ({ page }) => {
    // 1. open testing mode page
    await page.goto("http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3&testing_mode=1&testing_product_idno=40Y85-010A-M3");

    // wait AG Grid
    await expect(page.locator(".ag-root-wrapper")).toBeVisible();

    // 2. test data
    const materialPackCode = 'B4909892';
    const correctSlot = '10008-L';
    const wrongSlot = '10009-R';

    // 3. scan material
    const materialInput = getMainMaterialInput(page);
    const slotInput = getMainSlotInput(page);
    await materialInput.fill(materialPackCode);
    await materialInput.press('Enter');

    // 4. wait focus change and scan wrong slot
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill(wrongSlot);
    await slotInput.press('Enter');

    // 5. wrong slot should be error in testing mode
    const row = page.locator(`[row-id="${wrongSlot}"]`);
    await expect(row.locator('[col-id="correct"]')).toContainText('❌');
    await expect(row.locator('[col-id="materialInventoryIdno"]')).toContainText(materialPackCode);

    // 6. scan again with correct slot
    await materialInput.fill(materialPackCode);
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    const slotInputAfter = slotInput;
    await slotInputAfter.fill(correctSlot);
    await slotInputAfter.press('Enter');

    // 7. wrong slot should be cleared, correct slot should be updated
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
    await page.goto("http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3");
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
    await page.goto("http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3");
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
    test(`test material scan shows shared ERP error (${errorCase.label}) in panasonic detail page`, async ({ page }) => {
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

        await expectLatestMessage(page, 'error-message', errorCase.expectedMessage);
        await expect(materialInput).toHaveValue('');
        await expect(materialInput).toBeFocused();
        await expect(slotInput).not.toBeFocused();
    });
}

for (const errorCase of MATERIAL_LOOKUP_ERROR_CASES) {
    test(`test material scan shows shared ERP error (${errorCase.label}) in panasonic production page`, async ({ page }) => {
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

        await expectLatestMessage(page, 'error-message', errorCase.expectedMessage);
        await expect(materialInput).toHaveValue('');
        await expect(materialInput).toBeFocused();
        await expect(slotInput).not.toBeFocused();
    });
}

test('panasonic unload mode toggle and submit flow', async ({ page }) => {
    const productionUuid = 'unload-mode-mock-uuid';
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
                {
                    id: 1001,
                    feed_record_id: 1001,
                    operation_time: new Date(Date.now() + 1_000).toISOString(),
                    material_pack_code: 'APP-L',
                    feed_material_pack_type: 'NEW_MATERIAL_PACK',
                    check_pack_code_match: 'MATCHED_MATERIAL_PACK',
                },
            ],
        },
        {
            id: 2,
            work_order_no: 'ZZ9999',
            product_idno: '40Y85-010A-M3',
            machine_idno: 'A1-NPM-W2',
            machine_side: 'FRONT',
            board_side: 'DUPLEX',
            slot_idno: '10008',
            sub_slot_idno: 'R',
            material_idno: '88120-0001-S1',
            production_end: null,
            produce_mode: 'NORMAL_PRODUCE_MODE',
            feed_records: [
                {
                    id: 2000,
                    feed_record_id: 2000,
                    operation_time: now,
                    material_pack_code: 'MAIN-R',
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

    const unloadRequests: any[] = [];
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
            unloadRequests.push(body);
        }

        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({}),
        });
    });

    let materialInventoryRequestCount = 0;
    await page.route('**/smt/material_inventory/*', (route) => {
        materialInventoryRequestCount += 1;
        return route.continue();
    });

    await page.goto(`http://localhost/smt/panasonic-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();
    await expect(page.locator('[row-id="10008-L"]')).toBeVisible();

    const materialInput = getMainMaterialInput(page);
    await materialInput.fill('S5555');
    await materialInput.press('Enter');

    await expect(page.getByTestId('panasonic-mode-tag')).toBeVisible();
    await expect(page.getByTestId('unload-mode-panel')).toBeVisible();
    await expect(page.getByTestId('exit-unload-mode-btn')).toBeVisible();

    const unloadMaterialInput = page.getByTestId('unload-material-input');
    const unloadSlotInput = page.getByTestId('unload-slot-input');
    await expect(unloadMaterialInput).toBeFocused();
    expect(materialInventoryRequestCount).toBe(0);

    await unloadMaterialInput.fill('APP-L');
    await unloadMaterialInput.press('Enter');
    await expect(unloadSlotInput).toBeFocused();

    await unloadSlotInput.fill('10008');
    await unloadSlotInput.press('Enter');
    await expect(unloadMaterialInput).toHaveValue('');
    await expect(unloadSlotInput).toHaveValue('');
    await expect(unloadMaterialInput).toBeFocused();
    await expectLatestMessage(page, 'error-message', /有多個子槽位/);

    await unloadMaterialInput.fill('APP-L');
    await unloadMaterialInput.press('Enter');
    await expect(unloadSlotInput).toBeFocused();
    await unloadSlotInput.fill('10008-L');
    await unloadSlotInput.press('Enter');

    await expect.poll(() => unloadRequests.length).toBe(1);
    expect(unloadRequests[0]).toEqual(
        expect.objectContaining({
            stat_item_id: 1,
            slot_idno: '10008',
            sub_slot_idno: 'L',
            material_pack_code: 'APP-L',
            operation_type: 'UNFEED',
            feed_material_pack_type: null,
            unfeed_material_pack_type: 'NORMAL_UNFEED',
            check_pack_code_match: null,
        })
    );

    await expectLatestMessage(page, 'success-message', /卸料成功/);

    await expect(unloadMaterialInput).toHaveValue('');
    await expect(unloadSlotInput).toHaveValue('');
    await expect(unloadMaterialInput).toBeFocused();

    await unloadMaterialInput.fill('S5555');
    await unloadMaterialInput.press('Enter');

    await expect(page.getByTestId('panasonic-mode-tag')).toBeVisible();
    await expect(page.getByTestId('unload-mode-panel')).toHaveCount(0);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const row = page.locator(`[row-id="10008-L"]`);
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).not.toContainText('APP-L');
});

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


