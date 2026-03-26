import { test, expect, Page, type TestInfo } from '@playwright/test';
import { setupAuthToken } from './helpers/auth';
import { readCsvRecords, expectLatestMessage, type ScanRecord } from './helpers/scan';
import { mockSwitchUserApi } from './helpers/scanLogin';
const HEADED_VISUAL_STEP_DELAY_MS = 450;

test.beforeEach(async ({ page }) => {
    await setupAuthToken(page);
});

function shouldUseVisualStepDelay(testInfo: TestInfo) {
    const title = testInfo.title.toLowerCase();
    const isTargetTest =
        title.includes('unload') || title.includes('換料') || title.includes('error');
    return testInfo.project.use.headless === false && isTargetTest;
}

async function waitVisualStepIfNeeded(page: Page, testInfo: TestInfo) {
    if (!shouldUseVisualStepDelay(testInfo)) return;
    await page.waitForTimeout(HEADED_VISUAL_STEP_DELAY_MS);
}

const FUJI_NORMAL_URL =
    'http://localhost/smt/fuji-mounter/XP2B1/ZZ9999?product_idno=40X85-009B-TEST_SCAN&work_sheet_side=TOP';
const FUJI_TESTING_URL =
    'http://localhost/smt/fuji-mounter/XP2B1/ZZ9999?product_idno=40X85-009B-TEST_SCAN&work_sheet_side=TOP&testing_mode=1&testing_product_idno=40X85-009B-TEST_SCAN';

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

    const testingSlot = 'XP2B1-A-9';
    await scanOne(page, testingMaterialPack, testingSlot);

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
    await scanOne(page, postProductionMaterial, 'XP2B1-A-9');

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
    await page.goto(FUJI_NORMAL_URL + '&mock_scan=1');
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

test('fuji unload/replace flow keeps grid visible and auto exits after successful replace', async ({ page }, testInfo) => {
    const productionUuid = 'unload-replace-fuji-happy';
    const now = new Date().toISOString();
    const replacementPackCode = 'FUJI-REPLACE-1';
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
        {
            id: 2,
            work_order_no: 'ZZ9999',
            product_idno: '40X85-009B-TEST_SCAN',
            machine_idno: 'XP2B1',
            machine_side: 'FRONT',
            board_side: 'TOP',
            slot_idno: '9',
            sub_slot_idno: 'B',
            material_idno: 'MAT-2',
            production_end: null,
            produce_mode: 'NORMAL_PRODUCE_MODE',
            feed_records: [
                {
                    id: 2000,
                    feed_record_id: 2000,
                    operation_time: now,
                    material_pack_code: 'MAIN-2',
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

    const unfeedRequests: any[] = [];
    const feedRequests: any[] = [];
    await page.route('**/smt/fuji_mounter_item/stat/roll', async (route) => {
        const request = route.request();
        if (request.method() !== 'POST') return route.continue();
        const body = request.postDataJSON();
        if (body?.operation_type === 'UNFEED') unfeedRequests.push(body);
        if (body?.operation_type === 'FEED') feedRequests.push(body);
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({}),
        });
    });

    await page.route('**/smt/material_inventory/*', (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith(`/smt/material_inventory/${replacementPackCode}`)) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 1,
                    idno: replacementPackCode,
                    material_idno: 'MAT-1',
                    material_name: 'TEST-MATERIAL',
                }),
            });
        }
        if (url.pathname.endsWith('/smt/material_inventory/APP-1')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 2, idno: 'APP-1', material_idno: 'MAT-1', material_name: 'TEST-MATERIAL' }),
            });
        }
        return route.continue();
    });

    await page.goto(`http://localhost/smt/fuji-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.getByTestId('fuji-production-material-input').locator('input');
    await materialInput.fill('S5555');
    await materialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);

    await expect(page.getByTestId('fuji-operation-tag')).toContainText('換料卸除');
    await expect(page.getByTestId('fuji-exit-unload-mode-btn')).toBeVisible();
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const unloadMaterialInput = page.getByTestId('fuji-unload-material-input');
    const unloadSlotInput = page.getByTestId('fuji-unload-slot-input');
    await expect(unloadMaterialInput).toBeFocused();

    await unloadMaterialInput.fill('APP-1');
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect.poll(() => unfeedRequests.length).toBe(1);
    expect(unfeedRequests[0]).toEqual(
        expect.objectContaining({
            stat_item_id: 1,
            slot_idno: '9',
            sub_slot_idno: 'A',
            material_pack_code: 'APP-1',
            operation_type: 'UNFEED',
            unfeed_reason: 'MATERIAL_FINISHED',
        })
    );

    const row = page.locator('[row-id="9-A"]');
    await expect(row.locator('[col-id="correct"]')).toContainText('⛔');

    await unloadMaterialInput.fill(replacementPackCode);
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(unloadSlotInput).toBeFocused();

    await unloadSlotInput.fill('XP2B1-B-9');
    await unloadSlotInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expectLatestMessage(page, 'error-message', /請掃描原卸料站位/);
    await expect(unloadSlotInput).toBeFocused();

    await unloadSlotInput.fill('XP2B1-A-9');
    await unloadSlotInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect.poll(() => feedRequests.length).toBe(1);
    expect(feedRequests[0]).toEqual(
        expect.objectContaining({
            stat_item_id: 1,
            slot_idno: '9',
            sub_slot_idno: 'A',
            material_pack_code: replacementPackCode,
            operation_type: 'FEED',
        })
    );

    await expect(row.locator('[col-id="correct"]')).toContainText('✅');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText(replacementPackCode);
    await expect(page.getByTestId('fuji-exit-unload-mode-btn')).toHaveCount(0);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();
});

test('fuji force unload flow by slot (S5577) uses WRONG_MATERIAL and completes replace', async ({ page }, testInfo) => {
    const productionUuid = 'force-unload-fuji-happy';
    const now = new Date().toISOString();
    const replacementPackCode = 'FUJI-FORCE-REPLACE-1';
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

    const unfeedRequests: any[] = [];
    const feedRequests: any[] = [];
    await page.route('**/smt/fuji_mounter_item/stat/roll', async (route) => {
        const request = route.request();
        if (request.method() !== 'POST') return route.continue();
        const body = request.postDataJSON();
        if (body?.operation_type === 'UNFEED') unfeedRequests.push(body);
        if (body?.operation_type === 'FEED') feedRequests.push(body);
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({}),
        });
    });

    await page.route('**/smt/material_inventory/*', (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith(`/smt/material_inventory/${replacementPackCode}`)) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 1,
                    idno: replacementPackCode,
                    material_idno: 'MAT-1',
                    material_name: 'TEST-MATERIAL',
                }),
            });
        }
        return route.continue();
    });

    await page.goto(`http://localhost/smt/fuji-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.getByTestId('fuji-production-material-input').locator('input');
    await materialInput.fill('S5577');
    await materialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);

    await expect(page.getByTestId('fuji-exit-unload-mode-btn')).toBeVisible();

    const unloadMaterialInput = page.getByTestId('fuji-unload-material-input');
    const unloadSlotInput = page.getByTestId('fuji-unload-slot-input');
    await expect(unloadSlotInput).toBeFocused();

    await unloadSlotInput.fill('XP2B1-A-9');
    await unloadSlotInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect.poll(() => unfeedRequests.length).toBe(1);
    expect(unfeedRequests[0]).toEqual(
        expect.objectContaining({
            stat_item_id: 1,
            slot_idno: '9',
            sub_slot_idno: 'A',
            material_pack_code: 'APP-1',
            operation_type: 'UNFEED',
            unfeed_reason: 'WRONG_MATERIAL',
        })
    );

    const row = page.locator('[row-id="9-A"]');
    await expect(row.locator('[col-id="correct"]')).toContainText('⛔');
    await expect(unloadMaterialInput).toBeFocused();

    await unloadMaterialInput.fill(replacementPackCode);
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(unloadSlotInput).toBeFocused();

    await unloadSlotInput.fill('XP2B1-A-9');
    await unloadSlotInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect.poll(() => feedRequests.length).toBe(1);
    expect(feedRequests[0]).toEqual(
        expect.objectContaining({
            stat_item_id: 1,
            slot_idno: '9',
            sub_slot_idno: 'A',
            material_pack_code: replacementPackCode,
            operation_type: 'FEED',
        })
    );

    await expect(row.locator('[col-id="correct"]')).toContainText('✅');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText(replacementPackCode);
    await expect(page.getByTestId('fuji-exit-unload-mode-btn')).toHaveCount(0);
});

test('fuji force unload mode keeps phase when force slot has no matched stat', async ({ page }, testInfo) => {
    const productionUuid = 'force-unload-fuji-no-slot';
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
                    material_pack_code: 'APP-1',
                    feed_material_pack_type: 'NEW_MATERIAL_PACK',
                    check_pack_code_match: 'MATCHED_MATERIAL_PACK',
                },
            ],
        },
    ];

    await page.route(`**/smt/fuji_mounter_item/stats/${productionUuid}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStats) })
    );
    await page.route(`**/smt/fuji_mounter_item/stats/logs/${productionUuid}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    await page.goto(`http://localhost/smt/fuji-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.getByTestId('fuji-production-material-input').locator('input');
    await materialInput.fill('S5577');
    await materialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(page.getByTestId('fuji-exit-unload-mode-btn')).toBeVisible();

    const unloadSlotInput = page.getByTestId('fuji-unload-slot-input');
    await expect(unloadSlotInput).toBeFocused();
    await unloadSlotInput.fill('XP2B1-B-99');
    await unloadSlotInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expectLatestMessage(page, 'error-message', /找不到槽位/);
    await expect(unloadSlotInput).toBeFocused();
    await expect(unloadSlotInput).toHaveValue('');
    await expect(page.getByTestId('fuji-exit-unload-mode-btn')).toBeVisible();
});

test('fuji force unload mode keeps replace phase when replacement ERP lookup fails', async ({ page }, testInfo) => {
    const productionUuid = 'force-unload-fuji-replace-erp-fail';
    const replacementPackCode = 'FUJI-S5577-ERP-FAIL';
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
                    material_pack_code: 'APP-1',
                    feed_material_pack_type: 'NEW_MATERIAL_PACK',
                    check_pack_code_match: 'MATCHED_MATERIAL_PACK',
                },
            ],
        },
    ];

    await page.route(`**/smt/fuji_mounter_item/stats/${productionUuid}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStats) })
    );
    await page.route(`**/smt/fuji_mounter_item/stats/logs/${productionUuid}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    await page.route('**/smt/fuji_mounter_item/stat/roll', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );

    await page.route('**/smt/material_inventory/*', (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith(`/smt/material_inventory/${replacementPackCode}`)) {
            return route.fulfill({
                status: 502,
                contentType: 'application/json',
                body: JSON.stringify({ detail: 'Bad Gateway' }),
            });
        }
        return route.continue();
    });

    await page.goto(`http://localhost/smt/fuji-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.getByTestId('fuji-production-material-input').locator('input');
    await materialInput.fill('S5577');
    await materialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);

    const unloadMaterialInput = page.getByTestId('fuji-unload-material-input');
    const unloadSlotInput = page.getByTestId('fuji-unload-slot-input');
    await expect(unloadSlotInput).toBeFocused();

    await unloadSlotInput.fill('XP2B1-A-9');
    await unloadSlotInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(unloadMaterialInput).toBeFocused();

    await unloadMaterialInput.fill(replacementPackCode);
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expectLatestMessage(page, 'error-message', /ERP 連線錯誤/);
    await expect(unloadMaterialInput).toBeFocused();
    await expect(unloadMaterialInput).toHaveValue('');
    await expect(page.getByTestId('fuji-exit-unload-mode-btn')).toBeVisible();
});

test('fuji unload flow by pack (S5555) uses MATERIAL_FINISHED and completes replace', async ({ page }, testInfo) => {
    const productionUuid = 'unload-mode-fuji-s5555';
    const now = new Date().toISOString();
    const replacementPackCode = 'FUJI-S5555-REPLACE-1';
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

    const unfeedRequests: any[] = [];
    const feedRequests: any[] = [];
    await page.route('**/smt/fuji_mounter_item/stat/roll', async (route) => {
        const request = route.request();
        if (request.method() !== 'POST') return route.continue();
        const body = request.postDataJSON();
        if (body?.operation_type === 'UNFEED') unfeedRequests.push(body);
        if (body?.operation_type === 'FEED') feedRequests.push(body);
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({}),
        });
    });

    await page.route('**/smt/material_inventory/*', (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith(`/smt/material_inventory/${replacementPackCode}`)) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 1,
                    idno: replacementPackCode,
                    material_idno: 'MAT-1',
                    material_name: 'TEST-MATERIAL',
                }),
            });
        }
        if (url.pathname.endsWith('/smt/material_inventory/APP-1')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 2, idno: 'APP-1', material_idno: 'MAT-1', material_name: 'TEST-MATERIAL' }),
            });
        }
        return route.continue();
    });

    await page.goto(`http://localhost/smt/fuji-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.getByTestId('fuji-production-material-input').locator('input');
    await materialInput.fill('S5555');
    await materialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);

    await expect(page.getByTestId('fuji-exit-unload-mode-btn')).toBeVisible();

    const unloadMaterialInput = page.getByTestId('fuji-unload-material-input');
    const unloadSlotInput = page.getByTestId('fuji-unload-slot-input');
    await expect(unloadMaterialInput).toBeFocused();

    await unloadMaterialInput.fill('APP-1');
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect.poll(() => unfeedRequests.length).toBe(1);
    expect(unfeedRequests[0]).toEqual(
        expect.objectContaining({
            stat_item_id: 1,
            slot_idno: '9',
            sub_slot_idno: 'A',
            material_pack_code: 'APP-1',
            operation_type: 'UNFEED',
            unfeed_reason: 'MATERIAL_FINISHED',
        })
    );

    const row = page.locator('[row-id="9-A"]');
    await expect(row.locator('[col-id="correct"]')).toContainText('⛔');
    await expect(unloadMaterialInput).toBeFocused();

    await unloadMaterialInput.fill(replacementPackCode);
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(unloadSlotInput).toBeFocused();

    await unloadSlotInput.fill('XP2B1-A-9');
    await unloadSlotInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect.poll(() => feedRequests.length).toBe(1);
    expect(feedRequests[0]).toEqual(
        expect.objectContaining({
            stat_item_id: 1,
            slot_idno: '9',
            sub_slot_idno: 'A',
            material_pack_code: replacementPackCode,
            operation_type: 'FEED',
        })
    );

    await expect(row.locator('[col-id="correct"]')).toContainText('✅');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText(replacementPackCode);
    await expect(page.getByTestId('fuji-exit-unload-mode-btn')).toHaveCount(0);
});

test('fuji unload mode keeps phase when unload pack has no matched slot', async ({ page }, testInfo) => {
    const productionUuid = 'unload-replace-fuji-no-slot';
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
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStats) })
    );
    await page.route(`**/smt/fuji_mounter_item/stats/logs/${productionUuid}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    await page.goto(`http://localhost/smt/fuji-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.getByTestId('fuji-production-material-input').locator('input');
    await materialInput.fill('S5555');
    await materialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(page.getByTestId('fuji-exit-unload-mode-btn')).toBeVisible();

    const unloadMaterialInput = page.getByTestId('fuji-unload-material-input');
    await unloadMaterialInput.fill('UNKNOWN-PACK');
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expectLatestMessage(page, 'error-message', /找不到料號/);
    await expect(unloadMaterialInput).toBeFocused();
    await expect(unloadMaterialInput).toHaveValue('');
});

test('fuji unload mode shows error when unload pack maps to multiple slots', async ({ page }, testInfo) => {
    const productionUuid = 'unload-replace-fuji-multi-slot';
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
                    material_pack_code: 'DUP-PACK',
                    feed_material_pack_type: 'NEW_MATERIAL_PACK',
                    check_pack_code_match: 'MATCHED_MATERIAL_PACK',
                },
            ],
        },
        {
            id: 2,
            work_order_no: 'ZZ9999',
            product_idno: '40X85-009B-TEST_SCAN',
            machine_idno: 'XP2B1',
            machine_side: 'FRONT',
            board_side: 'TOP',
            slot_idno: '9',
            sub_slot_idno: 'B',
            material_idno: 'MAT-2',
            production_end: null,
            produce_mode: 'NORMAL_PRODUCE_MODE',
            feed_records: [
                {
                    id: 2000,
                    feed_record_id: 2000,
                    operation_time: now,
                    material_pack_code: 'DUP-PACK',
                    feed_material_pack_type: 'NEW_MATERIAL_PACK',
                    check_pack_code_match: 'MATCHED_MATERIAL_PACK',
                },
            ],
        },
    ];

    await page.route(`**/smt/fuji_mounter_item/stats/${productionUuid}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStats) })
    );
    await page.route(`**/smt/fuji_mounter_item/stats/logs/${productionUuid}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    await page.goto(`http://localhost/smt/fuji-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.getByTestId('fuji-production-material-input').locator('input');
    await materialInput.fill('S5555');
    await materialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);

    const unloadMaterialInput = page.getByTestId('fuji-unload-material-input');
    await unloadMaterialInput.fill('DUP-PACK');
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expectLatestMessage(page, 'error-message', /多個站位/);
    await expect(unloadMaterialInput).toBeFocused();
    await expect(unloadMaterialInput).toHaveValue('');
});

test('fuji unload mode keeps replace phase when replacement ERP lookup fails', async ({ page }, testInfo) => {
    const productionUuid = 'unload-replace-fuji-replace-erp-fail';
    const replacementPackCode = 'FUJI-ERP-FAIL';
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
                    material_pack_code: 'APP-1',
                    feed_material_pack_type: 'NEW_MATERIAL_PACK',
                    check_pack_code_match: 'MATCHED_MATERIAL_PACK',
                },
            ],
        },
    ];

    await page.route(`**/smt/fuji_mounter_item/stats/${productionUuid}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStats) })
    );
    await page.route(`**/smt/fuji_mounter_item/stats/logs/${productionUuid}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    await page.route('**/smt/fuji_mounter_item/stat/roll', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );

    await page.route('**/smt/material_inventory/*', (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith(`/smt/material_inventory/${replacementPackCode}`)) {
            return route.fulfill({
                status: 502,
                contentType: 'application/json',
                body: JSON.stringify({ detail: 'Bad Gateway' }),
            });
        }
        if (url.pathname.endsWith('/smt/material_inventory/APP-1')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 2, idno: 'APP-1', material_idno: 'MAT-1', material_name: 'TEST-MATERIAL' }),
            });
        }
        return route.continue();
    });

    await page.goto(`http://localhost/smt/fuji-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.getByTestId('fuji-production-material-input').locator('input');
    await materialInput.fill('S5555');
    await materialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);

    const unloadMaterialInput = page.getByTestId('fuji-unload-material-input');
    await unloadMaterialInput.fill('APP-1');
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);

    await unloadMaterialInput.fill(replacementPackCode);
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expectLatestMessage(page, 'error-message', /ERP 連線錯誤/);
    await expect(unloadMaterialInput).toBeFocused();
    await expect(unloadMaterialInput).toHaveValue('');
    await expect(page.getByTestId('fuji-exit-unload-mode-btn')).toBeVisible();
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

// ─── Scan Login (S1111) ───────────────────────────────────────────────────────

function mockFujiProductionActiveStats(page: Page, uuid: string) {
    return page.route(`**/smt/fuji_mounter_item/stats/${uuid}`, (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
                id: 1,
                uuid,
                created_at: '2026-01-01T00:00:00',
                updated_at: null,
                production_start: '2026-01-01T00:00:00',
                production_end: null,
                work_order_no: 'WO-TEST',
                product_idno: 'PROD-TEST',
                machine_idno: 'MACH-TEST',
                machine_side: null,
                board_side: null,
                slot_idno: 'SLOT-TEST',
                sub_slot_idno: '',
                material_idno: null,
                produce_mode: null,
            }]),
        })
    );
}

test('scan login: shows modal when not authenticated on fuji detail page load', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('authorized'));
    await mockSwitchUserApi(page);
    await page.goto(FUJI_NORMAL_URL);

    await expect(page.getByTestId('scan-login-modal')).toBeVisible();

    const loginInput = page.getByTestId('scan-login-input').locator('input');
    await loginInput.fill('1001:mysignature');
    await loginInput.press('Enter');

    await expect(page.getByTestId('scan-login-modal')).not.toBeVisible();
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();
});

test('scan login: shows modal when employee info missing from existing session on fuji detail page', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('authorized', JSON.stringify({
            OAuth2PasswordBearer: {
                schema: { flow: 'password', tokenUrl: '', scopes: {}, type: 'oauth2' },
                token: { access_token: 'old-token', token_type: 'bearer' },
                username: 'operator',
            },
            HTTPBasic: null,
        }));
    });
    await mockSwitchUserApi(page);
    await page.goto(FUJI_NORMAL_URL);

    await expect(page.getByTestId('scan-login-modal')).toBeVisible();

    const loginInput = page.getByTestId('scan-login-input').locator('input');
    await loginInput.fill('1001:mysignature');
    await loginInput.press('Enter');

    await expect(page.getByTestId('scan-login-modal')).not.toBeVisible();
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();
});

test('scan login: S1111 opens login modal on fuji detail page', async ({ page }) => {
    await page.goto(FUJI_NORMAL_URL);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.locator('.n-input input').first();
    await materialInput.fill('S1111');
    await materialInput.press('Enter');

    await expect(page.getByTestId('scan-login-modal')).toBeVisible();
});

test('scan login: S1111 success switches user on fuji detail page', async ({ page }) => {
    await mockSwitchUserApi(page);
    await page.goto(FUJI_NORMAL_URL);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.locator('.n-input input').first();
    await materialInput.fill('S1111');
    await materialInput.press('Enter');

    await expect(page.getByTestId('scan-login-modal')).toBeVisible();

    const loginInput = page.getByTestId('scan-login-input').locator('input');
    await loginInput.fill('1001:mysignature');
    await loginInput.press('Enter');

    await expect(page.getByTestId('scan-login-modal')).not.toBeVisible();
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();
    await expect(page.getByTestId('operator-name-tag')).toContainText('Switched User');
    await expect(page.getByTestId('operator-idno-tag')).toContainText('1001');
});

test('scan login: S1111 failure shows error on fuji detail page', async ({ page }) => {
    await mockSwitchUserApi(page, 401);
    await page.goto(FUJI_NORMAL_URL);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.locator('.n-input input').first();
    await materialInput.fill('S1111');
    await materialInput.press('Enter');

    await expect(page.getByTestId('scan-login-modal')).toBeVisible();

    const loginInput = page.getByTestId('scan-login-input').locator('input');
    await loginInput.fill('1001:wrongsignature');
    await loginInput.press('Enter');

    await expect(page.getByTestId('scan-login-error')).toBeVisible();
    await expect(page.getByTestId('scan-login-modal')).toBeVisible();
});

test('scan login: shows modal when not authenticated on fuji production page load', async ({ page }) => {
    const productionUuid = 'scan-login-fuji-prod';
    await page.addInitScript(() => localStorage.removeItem('authorized'));
    await page.route(`**/smt/fuji_mounter_item/stats/${productionUuid}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.route(`**/smt/fuji_mounter_item/stats/logs/${productionUuid}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await mockSwitchUserApi(page);
    await page.goto(`http://localhost/smt/fuji-mounter-production/${productionUuid}`);

    await expect(page.getByTestId('scan-login-modal')).toBeVisible();

    const loginInput = page.getByTestId('scan-login-input').locator('input');
    await loginInput.fill('1001:mysignature');
    await loginInput.press('Enter');

    await expect(page.getByTestId('scan-login-modal')).not.toBeVisible();
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();
});

test('scan login: S1111 opens login modal on fuji production page', async ({ page }) => {
    const productionUuid = 'scan-login-fuji-prod-s1111';
    await mockFujiProductionActiveStats(page, productionUuid);
    await page.route(`**/smt/fuji_mounter_item/stats/logs/${productionUuid}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.goto(`http://localhost/smt/fuji-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.getByTestId('fuji-production-material-input').locator('input');
    await materialInput.fill('S1111');
    await materialInput.press('Enter');

    await expect(page.getByTestId('scan-login-modal')).toBeVisible();
});

test('scan login: S1111 success switches user on fuji production page', async ({ page }) => {
    const productionUuid = 'scan-login-fuji-prod-success';
    await mockFujiProductionActiveStats(page, productionUuid);
    await page.route(`**/smt/fuji_mounter_item/stats/logs/${productionUuid}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await mockSwitchUserApi(page);
    await page.goto(`http://localhost/smt/fuji-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.getByTestId('fuji-production-material-input').locator('input');
    await materialInput.fill('S1111');
    await materialInput.press('Enter');

    await expect(page.getByTestId('scan-login-modal')).toBeVisible();

    const loginInput = page.getByTestId('scan-login-input').locator('input');
    await loginInput.fill('1001:mysignature');
    await loginInput.press('Enter');

    await expect(page.getByTestId('scan-login-modal')).not.toBeVisible();
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();
    await expect(page.getByTestId('operator-name-tag')).toContainText('Switched User');
    await expect(page.getByTestId('operator-idno-tag')).toContainText('1001');
});

test('scan login: S1111 failure shows error on fuji production page', async ({ page }) => {
    const productionUuid = 'scan-login-fuji-prod-fail';
    await mockFujiProductionActiveStats(page, productionUuid);
    await page.route(`**/smt/fuji_mounter_item/stats/logs/${productionUuid}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await mockSwitchUserApi(page, 401);
    await page.goto(`http://localhost/smt/fuji-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.getByTestId('fuji-production-material-input').locator('input');
    await materialInput.fill('S1111');
    await materialInput.press('Enter');

    await expect(page.getByTestId('scan-login-modal')).toBeVisible();

    const loginInput = page.getByTestId('scan-login-input').locator('input');
    await loginInput.fill('1001:wrongsignature');
    await loginInput.press('Enter');

    await expect(page.getByTestId('scan-login-error')).toBeVisible();
    await expect(page.getByTestId('scan-login-modal')).toBeVisible();
});

