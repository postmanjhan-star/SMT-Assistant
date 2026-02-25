import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

type ScanRecord = { material: string; slot: string };

const FUJI_NORMAL_URL =
    'http://localhost/smt/fuji-mounter/XP2B1/ZZ9999?product_idno=40X85-009B-TEST_SCAN&work_sheet_side=TOP';
const FUJI_TESTING_URL =
    'http://localhost/smt/fuji-mounter/XP2B1/ZZ9999?product_idno=40X85-009B-TEST_SCAN&work_sheet_side=TOP&testing_mode=1&testing_product_idno=40X85-009B-TEST_SCAN';

function readCsvRecords(): ScanRecord[] {
    const csvPath = path.join(
        process.cwd(),
        'tests/e2e/data/fuji_mounter_feed_records.csv'
    );

    if (!fs.existsSync(csvPath)) {
        console.warn(`CSV file not found at ${csvPath}, returning empty list.`);
        return [];
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const records: ScanRecord[] = [];

    for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 2 && parts[0].trim()) {
            records.push({ material: parts[0].trim(), slot: parts[1].trim() });
        }
    }

    return records;
}

async function waitForSlotFocus(
    page: Page,
    materialInput: ReturnType<Page['locator']>
) {
    await page.waitForFunction(
        (matInputEl) => {
            const active = document.activeElement as HTMLInputElement | null;
            return !!active && active.tagName === 'INPUT' && active !== matInputEl;
        },
        await materialInput.elementHandle(),
        { timeout: 10000 }
    );
}

async function scanOne(page: Page, material: string, slot: string) {
    const materialInput = page.locator('.n-input input').first();
    await expect(materialInput).toBeVisible();

    await materialInput.click();
    await materialInput.fill(material);
    await page.waitForTimeout(300);
    await materialInput.press('Enter');

    await waitForSlotFocus(page, materialInput);

    const slotInput = page.locator('*:focus');
    await slotInput.fill(slot);
    await slotInput.press('Enter');
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

async function scanAll(page: Page, records: ScanRecord[]) {
    for (const [index, record] of records.entries()) {
        console.log(`正在處理第 ${index + 1}/${records.length} 筆: ${record.material}`);
        try {
            await scanOne(page, record.material, record.slot);
        } catch (e) {
            console.log(`⚠️ 處理 ${record.material} 時發生超時或錯誤，跳過此筆。`);
        }
    }
}

test('test scan fuji mounter feed records in normal mode', async ({ page }) => {
    test.setTimeout(300000);

    const records = readCsvRecords();
    console.log(`共載入 ${records.length} 筆資料`);

    await page.goto(FUJI_NORMAL_URL);

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

    await scanAll(page, records);
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

    const records = readCsvRecords();
    console.log(`總共 ${records.length} 筆資料`);

    await page.goto(FUJI_TESTING_URL);

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

    const records = readCsvRecords();
    await page.goto(FUJI_TESTING_URL);
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

    const testingSlot = 'XP2B1-A-9';
    await scanOne(page, testingMaterialPack, testingSlot);

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

    await page.goto(FUJI_TESTING_URL);
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
    await scanOne(page, postProductionMaterial, 'XP2B1-A-9');

    const row = page.locator(`[row-id="XP2B1-A-9"]`);
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
    await page.goto(FUJI_NORMAL_URL);
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

    console.log('done: wrong slot cleared and correct slot updated');
});

test('test wrong slot scan in testing mode', async ({ page }) => {
    await page.goto(FUJI_TESTING_URL);
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
    await page.goto(FUJI_NORMAL_URL);
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

test('test start production blocked when slots are not fully bound in normal mode', async ({ page }) => {
    await page.goto(FUJI_NORMAL_URL);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const startBtn = page.getByRole('button', { name: /開始生產/ });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    await expectLatestMessage(page, 'error-message', '尚有槽位未綁定，不能開始生產');
    await expect(page).toHaveURL(/\/smt\/fuji-mounter\/XP2B1\/ZZ9999/);
});

test('fuji unload mode toggle and submit flow', async ({ page }) => {
    const productionUuid = 'fuji-unload-mode-mock-uuid';
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
                {
                    id: 1001,
                    feed_record_id: 1001,
                    operation_time: new Date(Date.now() + 1_000).toISOString(),
                    material_pack_code: 'APP-1',
                    feed_material_pack_type: 'NEW_MATERIAL_PACK',
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

    const unloadRequests: any[] = [];
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

    await page.goto(`http://localhost/smt/fuji-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();
    await expect(page.locator('[row-id="XP2B1-A-9"]')).toBeVisible();

    const materialInput = page.getByTestId('material-input').locator('input');
    await materialInput.fill('S5555');
    await materialInput.press('Enter');

    await expect(page.getByTestId('fuji-mode-tag')).toContainText('換料卸除');
    await expect(page.getByTestId('fuji-unload-mode-panel')).toBeVisible();
    await expect(page.getByTestId('fuji-exit-unload-mode-btn')).toBeVisible();

    const unloadMaterialInput = page.getByTestId('fuji-unload-material-input');
    const unloadSlotInput = page.getByTestId('fuji-unload-slot-input');
    await expect(unloadMaterialInput).toBeFocused();
    expect(materialInventoryRequestCount).toBe(0);

    await unloadMaterialInput.fill('APP-1');
    await unloadMaterialInput.press('Enter');
    await expect(unloadSlotInput).toBeFocused();

    await unloadSlotInput.fill('XP2B1-Z-9');
    await unloadSlotInput.dispatchEvent('keydown', { key: 'Enter' });
    await expectLatestMessage(page, 'error-message', /槽位格式錯誤/);

    await unloadSlotInput.fill('XP2B1-A-9');
    await unloadSlotInput.dispatchEvent('keydown', { key: 'Enter' });

    await expect.poll(() => unloadRequests.length).toBe(1);
    expect(unloadRequests[0]).toEqual(
        expect.objectContaining({
            stat_item_id: 1,
            slot_idno: '9',
            sub_slot_idno: 'A',
            material_pack_code: 'APP-1',
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

    await expect(page.getByTestId('fuji-mode-tag')).not.toContainText('換料卸除');
    await expect(page.getByTestId('fuji-unload-mode-panel')).toHaveCount(0);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const row = page.locator(`[row-id="XP2B1-A-9"]`);
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).not.toContainText('APP-1');
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
