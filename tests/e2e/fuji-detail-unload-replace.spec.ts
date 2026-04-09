import { test, expect } from '@playwright/test';
import { setupAuthToken } from './helpers/auth';
import { expectLatestMessage } from './helpers/scan';
import { waitVisualStepIfNeeded } from './helpers/pageActions';
import { MACHINE_URLS } from './pages/DetailPage';

const FUJI_NORMAL_URL = MACHINE_URLS.fuji.normal;

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    await setupAuthToken(page);
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
                    operation_time: new Date(Date.now() + 500).toISOString(),
                    material_pack_code: 'MAIN-1',
                    operation_type: 'UNFEED',
                    feed_material_pack_type: null,
                },
                {
                    id: 1002,
                    feed_record_id: 1002,
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
                    operation_time: new Date(Date.now() + 500).toISOString(),
                    material_pack_code: 'MAIN-1',
                    operation_type: 'UNFEED',
                    feed_material_pack_type: null,
                },
                {
                    id: 1002,
                    feed_record_id: 1002,
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
                    operation_time: new Date(Date.now() + 500).toISOString(),
                    material_pack_code: 'MAIN-1',
                    operation_type: 'UNFEED',
                    feed_material_pack_type: null,
                },
                {
                    id: 1002,
                    feed_record_id: 1002,
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

test('fuji S5555 succeeds when two slots share the same material_idno but have distinct pack codes (production page)', async ({ page }, testInfo) => {
    const productionUuid = 'unload-fuji-same-mat-idno-prod';
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
            material_idno: 'SAME-MAT',
            production_end: null,
            produce_mode: 'NORMAL_PRODUCE_MODE',
            feed_records: [
                {
                    id: 1000,
                    feed_record_id: 1000,
                    operation_time: now,
                    material_pack_code: 'FUJI-DUP-MAT-A',
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
            material_idno: 'SAME-MAT', // same material_idno as slot A
            production_end: null,
            produce_mode: 'NORMAL_PRODUCE_MODE',
            feed_records: [
                {
                    id: 2000,
                    feed_record_id: 2000,
                    operation_time: now,
                    material_pack_code: 'FUJI-DUP-MAT-B', // different pack code
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

    const unfeedRequests: any[] = [];
    const feedRequests: any[] = [];
    await page.route('**/smt/fuji_mounter_item/stat/roll', async (route) => {
        const request = route.request();
        if (request.method() !== 'POST') return route.continue();
        const body = request.postDataJSON();
        if (body?.operation_type === 'UNFEED') unfeedRequests.push(body);
        if (body?.operation_type === 'FEED') feedRequests.push(body);
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await page.route('**/smt/material_inventory/*', (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith('/smt/material_inventory/FUJI-DUP-MAT-A')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 1, idno: 'FUJI-DUP-MAT-A', material_idno: 'SAME-MAT', material_name: 'TEST-MATERIAL' }),
            });
        }
        if (url.pathname.endsWith('/smt/material_inventory/FUJI-DUP-REPLACE')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 3, idno: 'FUJI-DUP-REPLACE', material_idno: 'SAME-MAT', material_name: 'TEST-MATERIAL' }),
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

    // scanning FUJI-DUP-MAT-A should uniquely find slot 9-A (not "多個站位" error)
    await unloadMaterialInput.fill('FUJI-DUP-MAT-A');
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect.poll(() => unfeedRequests.length).toBe(1);
    expect(unfeedRequests[0]).toEqual(
        expect.objectContaining({
            stat_item_id: 1,
            slot_idno: '9',
            sub_slot_idno: 'A',
            material_pack_code: 'FUJI-DUP-MAT-A',
            operation_type: 'UNFEED',
            unfeed_reason: 'MATERIAL_FINISHED',
        })
    );

    const row = page.locator('[row-id="9-A"]');
    await expect(row.locator('[col-id="correct"]')).toContainText('⛔');
    await expect(unloadMaterialInput).toBeFocused();

    await unloadMaterialInput.fill('FUJI-DUP-REPLACE');
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
            material_pack_code: 'FUJI-DUP-REPLACE',
            operation_type: 'FEED',
        })
    );

    await expect(row.locator('[col-id="correct"]')).toContainText('✅');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText('FUJI-DUP-REPLACE');
    await expect(page.getByTestId('fuji-exit-unload-mode-btn')).toHaveCount(0);
});

test('fuji S5555 succeeds when two slots share the same material_idno but have distinct pack codes (detail page)', async ({ page }, testInfo) => {
    const mockMounterFiles = [{
        id: 1,
        file_name: 'test',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
        product_idno: '40X85-009B-TEST_SCAN',
        product_ver: '1',
        mounter_idno: 'XP2B1',
        board_side: 'TOP',
        fuji_mounter_file_items: [
            { id: 1, fuji_mounter_file_id: 1, stage: 'A', slot: 9, original: 'A', alt_slot: 0, part_number: 'SAME-PART-001', feeder_name: 'type-A', feed_count: 100, skip: false, status: 'OK', tray_direction: 0 },
            { id: 2, fuji_mounter_file_id: 1, stage: 'B', slot: 9, original: 'B', alt_slot: 0, part_number: 'SAME-PART-001', feeder_name: 'type-B', feed_count: 100, skip: false, status: 'OK', tray_direction: 0 },
        ],
    }];

    await page.route('**/smt/fuji_mounter/ZZ9999', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMounterFiles) })
    );

    await page.goto(FUJI_NORMAL_URL + '&mock_scan=1');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.getByTestId('fuji-detail-material-input').locator('input');
    const slotInput = page.getByTestId('fuji-detail-slot-input').locator('input');

    // scan first material → slot XP2B1-A-9
    await materialInput.fill('FUJI-DETAIL-PACK-A');
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill('XP2B1-A-9');
    await slotInput.press('Enter');
    await expect(materialInput).toBeFocused({ timeout: 5000 });

    // scan second material → slot XP2B1-B-9
    await materialInput.fill('FUJI-DETAIL-PACK-B');
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill('XP2B1-B-9');
    await slotInput.press('Enter');
    await expect(materialInput).toBeFocused({ timeout: 5000 });

    // verify initial state: both rows have their pack codes
    const rowA = page.locator('[row-id="XP2B1-A-9"]');
    const rowB = page.locator('[row-id="XP2B1-B-9"]');
    await expect(rowA.locator('[col-id="materialInventoryIdno"]')).toContainText('FUJI-DETAIL-PACK-A');
    await expect(rowB.locator('[col-id="materialInventoryIdno"]')).toContainText('FUJI-DETAIL-PACK-B');

    // trigger S5555 unload mode
    await materialInput.fill('S5555');
    await materialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);

    const unloadMaterialInput = page.locator('#detail-unload-material-input');
    const unloadSlotInput = page.locator('#detail-unload-slot-input');
    await expect(unloadMaterialInput).toBeVisible({ timeout: 5000 });

    // scanning FUJI-DETAIL-PACK-A uniquely finds XP2B1-A-9 (not "多個站位" error)
    await unloadMaterialInput.fill('FUJI-DETAIL-PACK-A');
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(rowA.locator('[col-id="correct"]')).toContainText('⛔', { timeout: 5000 });

    // scan replacement pack code (mock mode → auto MATCHED, slot input focused)
    await unloadMaterialInput.fill('FUJI-DETAIL-REPLACE');
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(unloadSlotInput).toBeFocused({ timeout: 5000 });

    // confirm slot → row shows ✅, unload mode exits automatically
    await unloadSlotInput.fill('XP2B1-A-9');
    await unloadSlotInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(rowA.locator('[col-id="correct"]')).toContainText('✅', { timeout: 5000 });
    await expect(unloadMaterialInput).not.toBeVisible();
});

