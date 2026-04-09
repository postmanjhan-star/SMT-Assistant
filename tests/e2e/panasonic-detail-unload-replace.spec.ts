import { test, expect, Page } from '@playwright/test';
import { setupAuthToken } from './helpers/auth';
import { expectLatestMessage } from './helpers/scan';
import { waitVisualStepIfNeeded } from './helpers/pageActions';
import { DetailPage } from './pages/DetailPage';

const getMainMaterialInput = (page: Page) => new DetailPage(page, 'panasonic').materialInput;
const getMainSlotInput = (page: Page) => new DetailPage(page, 'panasonic').slotInput;

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    await setupAuthToken(page);
});

test('panasonic unload/replace flow keeps grid visible and auto exits after successful replace', async ({ page }, testInfo) => {
    const productionUuid = 'unload-replace-panasonic-happy';
    const now = new Date().toISOString();
    const replacementPackCode = 'REPLACE-L';
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
                    operation_time: new Date(Date.now() + 500).toISOString(),
                    material_pack_code: 'MAIN-L',
                    operation_type: 'UNFEED',
                    feed_material_pack_type: null,
                },
                {
                    id: 1002,
                    feed_record_id: 1002,
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

    const unfeedRequests: any[] = [];
    const feedRequests: any[] = [];
    await page.route('**/smt/panasonic_mounter_item/stat/roll', async (route) => {
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
                    material_idno: '88120-0001-S0',
                    material_name: 'TEST-MATERIAL',
                }),
            });
        }
        if (url.pathname.endsWith('/smt/material_inventory/APP-L')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 2, idno: 'APP-L', material_idno: '88120-0001-S0', material_name: 'TEST-MATERIAL' }),
            });
        }
        return route.continue();
    });

    await page.goto(`http://localhost/smt/panasonic-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = getMainMaterialInput(page);
    await materialInput.fill('S5555');
    await materialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);

    await expect(page.getByTestId('exit-unload-mode-btn')).toBeVisible();
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const unloadMaterialInput = page.getByTestId('unload-material-input');
    const unloadSlotInput = page.getByTestId('unload-slot-input');
    await expect(unloadMaterialInput).toBeFocused();

    await unloadMaterialInput.fill('APP-L');
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect.poll(() => unfeedRequests.length).toBe(1);
    expect(unfeedRequests[0]).toEqual(
        expect.objectContaining({
            stat_item_id: 1,
            slot_idno: '10008',
            sub_slot_idno: 'L',
            material_pack_code: 'APP-L',
            operation_type: 'UNFEED',
            unfeed_reason: 'MATERIAL_FINISHED',
        })
    );

    const row = page.locator('[row-id="10008-L"]');
    await expect(row.locator('[col-id="correct"]')).toContainText('⛔');

    await unloadMaterialInput.fill(replacementPackCode);
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(unloadSlotInput).toBeFocused();

    await unloadSlotInput.fill('10008-R');
    await unloadSlotInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expectLatestMessage(page, 'error-message', /請掃描原卸料站位/);
    await expect(unloadSlotInput).toBeFocused();

    await unloadSlotInput.fill('10008-L');
    await unloadSlotInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect.poll(() => feedRequests.length).toBe(1);
    expect(feedRequests[0]).toEqual(
        expect.objectContaining({
            stat_item_id: 1,
            slot_idno: '10008',
            sub_slot_idno: 'L',
            material_pack_code: replacementPackCode,
            operation_type: 'FEED',
        })
    );

    await expect(row.locator('[col-id="correct"]')).toContainText('✅');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText(replacementPackCode);
    await expect(page.getByTestId('exit-unload-mode-btn')).toHaveCount(0);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();
});

test('panasonic force unload flow by slot (S5577) uses WRONG_MATERIAL and completes replace', async ({ page }, testInfo) => {
    const productionUuid = 'force-unload-panasonic-happy';
    const now = new Date().toISOString();
    const replacementPackCode = 'FORCE-REPLACE-L';
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
                    operation_time: new Date(Date.now() + 500).toISOString(),
                    material_pack_code: 'MAIN-L',
                    operation_type: 'UNFEED',
                    feed_material_pack_type: null,
                },
                {
                    id: 1002,
                    feed_record_id: 1002,
                    operation_time: new Date(Date.now() + 1_000).toISOString(),
                    material_pack_code: 'APP-L',
                    feed_material_pack_type: 'NEW_MATERIAL_PACK',
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

    const unfeedRequests: any[] = [];
    const feedRequests: any[] = [];
    await page.route('**/smt/panasonic_mounter_item/stat/roll', async (route) => {
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
                    material_idno: '88120-0001-S0',
                    material_name: 'TEST-MATERIAL',
                }),
            });
        }
        return route.continue();
    });

    await page.goto(`http://localhost/smt/panasonic-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = getMainMaterialInput(page);
    await materialInput.fill('S5577');
    await materialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);

    await expect(page.getByTestId('exit-unload-mode-btn')).toBeVisible();

    const unloadMaterialInput = page.getByTestId('unload-material-input');
    const unloadSlotInput = page.getByTestId('unload-slot-input');
    await expect(unloadSlotInput).toBeFocused();

    await unloadSlotInput.fill('10008-L');
    await unloadSlotInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect.poll(() => unfeedRequests.length).toBe(1);
    expect(unfeedRequests[0]).toEqual(
        expect.objectContaining({
            stat_item_id: 1,
            slot_idno: '10008',
            sub_slot_idno: 'L',
            material_pack_code: 'APP-L',
            operation_type: 'UNFEED',
            unfeed_reason: 'WRONG_MATERIAL',
        })
    );

    const row = page.locator('[row-id="10008-L"]');
    await expect(row.locator('[col-id="correct"]')).toContainText('⛔');
    await expect(unloadMaterialInput).toBeFocused();

    await unloadMaterialInput.fill(replacementPackCode);
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(unloadSlotInput).toBeFocused();

    await unloadSlotInput.fill('10008-L');
    await unloadSlotInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect.poll(() => feedRequests.length).toBe(1);
    expect(feedRequests[0]).toEqual(
        expect.objectContaining({
            stat_item_id: 1,
            slot_idno: '10008',
            sub_slot_idno: 'L',
            material_pack_code: replacementPackCode,
            operation_type: 'FEED',
        })
    );

    await expect(row.locator('[col-id="correct"]')).toContainText('✅');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText(replacementPackCode);
    await expect(page.getByTestId('exit-unload-mode-btn')).toHaveCount(0);
});

test('panasonic unload flow by pack (S5555) uses MATERIAL_FINISHED and completes replace', async ({ page }, testInfo) => {
    const productionUuid = 'unload-mode-panasonic-s5555';
    const now = new Date().toISOString();
    const replacementPackCode = 'S5555-REPLACE-L';
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
                    operation_time: new Date(Date.now() + 500).toISOString(),
                    material_pack_code: 'MAIN-L',
                    operation_type: 'UNFEED',
                    feed_material_pack_type: null,
                },
                {
                    id: 1002,
                    feed_record_id: 1002,
                    operation_time: new Date(Date.now() + 1_000).toISOString(),
                    material_pack_code: 'APP-L',
                    feed_material_pack_type: 'NEW_MATERIAL_PACK',
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

    const unfeedRequests: any[] = [];
    const feedRequests: any[] = [];
    await page.route('**/smt/panasonic_mounter_item/stat/roll', async (route) => {
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
                    material_idno: '88120-0001-S0',
                    material_name: 'TEST-MATERIAL',
                }),
            });
        }
        if (url.pathname.endsWith('/smt/material_inventory/APP-L')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 2, idno: 'APP-L', material_idno: '88120-0001-S0', material_name: 'TEST-MATERIAL' }),
            });
        }
        return route.continue();
    });

    await page.goto(`http://localhost/smt/panasonic-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = getMainMaterialInput(page);
    await materialInput.fill('S5555');
    await materialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);

    await expect(page.getByTestId('exit-unload-mode-btn')).toBeVisible();

    const unloadMaterialInput = page.getByTestId('unload-material-input');
    const unloadSlotInput = page.getByTestId('unload-slot-input');
    await expect(unloadMaterialInput).toBeFocused();

    await unloadMaterialInput.fill('APP-L');
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect.poll(() => unfeedRequests.length).toBe(1);
    expect(unfeedRequests[0]).toEqual(
        expect.objectContaining({
            stat_item_id: 1,
            slot_idno: '10008',
            sub_slot_idno: 'L',
            material_pack_code: 'APP-L',
            operation_type: 'UNFEED',
            unfeed_reason: 'MATERIAL_FINISHED',
        })
    );

    const row = page.locator('[row-id="10008-L"]');
    await expect(row.locator('[col-id="correct"]')).toContainText('⛔');
    await expect(unloadMaterialInput).toBeFocused();

    await unloadMaterialInput.fill(replacementPackCode);
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(unloadSlotInput).toBeFocused();

    await unloadSlotInput.fill('10008-L');
    await unloadSlotInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect.poll(() => feedRequests.length).toBe(1);
    expect(feedRequests[0]).toEqual(
        expect.objectContaining({
            stat_item_id: 1,
            slot_idno: '10008',
            sub_slot_idno: 'L',
            material_pack_code: replacementPackCode,
            operation_type: 'FEED',
        })
    );

    await expect(row.locator('[col-id="correct"]')).toContainText('✅');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText(replacementPackCode);
    await expect(page.getByTestId('exit-unload-mode-btn')).toHaveCount(0);
});

test('panasonic unload mode keeps phase when unload pack has no matched slot', async ({ page }, testInfo) => {
    const productionUuid = 'unload-replace-panasonic-no-slot';
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
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStats) })
    );
    await page.route(`**/smt/panasonic_mounter_item/stats/logs/${productionUuid}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    await page.goto(`http://localhost/smt/panasonic-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = getMainMaterialInput(page);
    await materialInput.fill('S5555');
    await materialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(page.getByTestId('exit-unload-mode-btn')).toBeVisible();

    const unloadMaterialInput = page.getByTestId('unload-material-input');
    await unloadMaterialInput.fill('UNKNOWN-PACK');
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expectLatestMessage(page, 'error-message', /找不到料號/);
    await expect(unloadMaterialInput).toBeFocused();
    await expect(unloadMaterialInput).toHaveValue('');
});

test('panasonic unload mode shows error when unload pack maps to multiple slots', async ({ page }, testInfo) => {
    const productionUuid = 'unload-replace-panasonic-multi-slot';
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
                    material_pack_code: 'DUP-PACK',
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
            slot_idno: '10009',
            sub_slot_idno: 'R',
            material_idno: '88120-0001-S1',
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

    await page.route(`**/smt/panasonic_mounter_item/stats/${productionUuid}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStats) })
    );
    await page.route(`**/smt/panasonic_mounter_item/stats/logs/${productionUuid}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    await page.goto(`http://localhost/smt/panasonic-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = getMainMaterialInput(page);
    await materialInput.fill('S5555');
    await materialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);

    const unloadMaterialInput = page.getByTestId('unload-material-input');
    await unloadMaterialInput.fill('DUP-PACK');
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expectLatestMessage(page, 'error-message', /多個站位/);
    await expect(unloadMaterialInput).toBeFocused();
    await expect(unloadMaterialInput).toHaveValue('');
});

test('panasonic unload mode keeps replace phase when replacement ERP lookup fails', async ({ page }, testInfo) => {
    const productionUuid = 'unload-replace-panasonic-replace-erp-fail';
    const replacementPackCode = 'PANASONIC-ERP-FAIL';
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
                    material_pack_code: 'APP-L',
                    feed_material_pack_type: 'NEW_MATERIAL_PACK',
                    check_pack_code_match: 'MATCHED_MATERIAL_PACK',
                },
            ],
        },
    ];

    await page.route(`**/smt/panasonic_mounter_item/stats/${productionUuid}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStats) })
    );
    await page.route(`**/smt/panasonic_mounter_item/stats/logs/${productionUuid}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    await page.route('**/smt/panasonic_mounter_item/stat/roll', (route) =>
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
        if (url.pathname.endsWith('/smt/material_inventory/APP-L')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 2, idno: 'APP-L', material_idno: '88120-0001-S0', material_name: 'TEST-MATERIAL' }),
            });
        }
        return route.continue();
    });

    await page.goto(`http://localhost/smt/panasonic-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = getMainMaterialInput(page);
    await materialInput.fill('S5555');
    await materialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);

    const unloadMaterialInput = page.getByTestId('unload-material-input');
    await unloadMaterialInput.fill('APP-L');
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);

    await unloadMaterialInput.fill(replacementPackCode);
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expectLatestMessage(page, 'error-message', /ERP 連線錯誤/);
    await expect(unloadMaterialInput).toBeFocused();
    await expect(unloadMaterialInput).toHaveValue('');
    await expect(page.getByTestId('exit-unload-mode-btn')).toBeVisible();
});

test('panasonic S5555 succeeds when two slots share the same material_idno but have distinct pack codes (production page)', async ({ page }, testInfo) => {
    const productionUuid = 'unload-panasonic-same-mat-idno-prod';
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
            material_idno: '88120-0001',
            production_end: null,
            produce_mode: 'NORMAL_PRODUCE_MODE',
            feed_records: [
                {
                    id: 1000,
                    feed_record_id: 1000,
                    operation_time: now,
                    material_pack_code: 'DUP-MAT-A',
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
            slot_idno: '10009',
            sub_slot_idno: 'R',
            material_idno: '88120-0001', // same material_idno as slot L
            production_end: null,
            produce_mode: 'NORMAL_PRODUCE_MODE',
            feed_records: [
                {
                    id: 2000,
                    feed_record_id: 2000,
                    operation_time: now,
                    material_pack_code: 'DUP-MAT-B', // different pack code
                    feed_material_pack_type: 'NEW_MATERIAL_PACK',
                    check_pack_code_match: 'MATCHED_MATERIAL_PACK',
                },
            ],
        },
    ];

    await page.route(`**/smt/panasonic_mounter_item/stats/${productionUuid}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStats) })
    );
    await page.route(`**/smt/panasonic_mounter_item/stats/logs/${productionUuid}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    const unfeedRequests: any[] = [];
    const feedRequests: any[] = [];
    await page.route('**/smt/panasonic_mounter_item/stat/roll', async (route) => {
        const request = route.request();
        if (request.method() !== 'POST') return route.continue();
        const body = request.postDataJSON();
        if (body?.operation_type === 'UNFEED') unfeedRequests.push(body);
        if (body?.operation_type === 'FEED') feedRequests.push(body);
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await page.route('**/smt/material_inventory/*', (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith('/smt/material_inventory/DUP-MAT-A')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 1, idno: 'DUP-MAT-A', material_idno: '88120-0001', material_name: 'TEST-MATERIAL' }),
            });
        }
        if (url.pathname.endsWith('/smt/material_inventory/DUP-MAT-REPLACE')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 3, idno: 'DUP-MAT-REPLACE', material_idno: '88120-0001', material_name: 'TEST-MATERIAL' }),
            });
        }
        return route.continue();
    });

    await page.goto(`http://localhost/smt/panasonic-mounter-production/${productionUuid}`);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = getMainMaterialInput(page);
    await materialInput.fill('S5555');
    await materialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(page.getByTestId('exit-unload-mode-btn')).toBeVisible();

    const unloadMaterialInput = page.getByTestId('unload-material-input');
    const unloadSlotInput = page.getByTestId('unload-slot-input');
    await expect(unloadMaterialInput).toBeFocused();

    // scanning DUP-MAT-A should uniquely find slot 10008-L (not "多個站位" error)
    await unloadMaterialInput.fill('DUP-MAT-A');
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect.poll(() => unfeedRequests.length).toBe(1);
    expect(unfeedRequests[0]).toEqual(
        expect.objectContaining({
            stat_item_id: 1,
            slot_idno: '10008',
            sub_slot_idno: 'L',
            material_pack_code: 'DUP-MAT-A',
            operation_type: 'UNFEED',
            unfeed_reason: 'MATERIAL_FINISHED',
        })
    );

    const row = page.locator('[row-id="10008-L"]');
    await expect(row.locator('[col-id="correct"]')).toContainText('⛔');
    await expect(unloadMaterialInput).toBeFocused();

    await unloadMaterialInput.fill('DUP-MAT-REPLACE');
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(unloadSlotInput).toBeFocused();

    await unloadSlotInput.fill('10008-L');
    await unloadSlotInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect.poll(() => feedRequests.length).toBe(1);
    expect(feedRequests[0]).toEqual(
        expect.objectContaining({
            stat_item_id: 1,
            slot_idno: '10008',
            sub_slot_idno: 'L',
            material_pack_code: 'DUP-MAT-REPLACE',
            operation_type: 'FEED',
        })
    );

    await expect(row.locator('[col-id="correct"]')).toContainText('✅');
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText('DUP-MAT-REPLACE');
    await expect(page.getByTestId('exit-unload-mode-btn')).toHaveCount(0);
});

test('panasonic S5555 succeeds when two slots share the same material_idno but have distinct pack codes (detail page)', async ({ page }, testInfo) => {
    const mockMounterFile = {
        file_name: 'test',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        product_idno: '40Y85-010A-M3',
        product_ver: '1',
        mounter_idno: 'A1-NPM-W2',
        board_side: 'DUPLEX',
        panasonic_mounter_file_items: [
            { id: 1, slot_idno: '10008', sub_slot_idno: 'L', smd_model_idno: 'SAME-MAT-001', feeder_idno: 'F1', smd_description: 'Test', smd_quantity: 1 },
            { id: 2, slot_idno: '10009', sub_slot_idno: 'R', smd_model_idno: 'SAME-MAT-001', feeder_idno: 'F2', smd_description: 'Test', smd_quantity: 1 },
        ],
    };

    await page.route('**/smt/panasonic_mounter/A1-NPM-W2/ZZ9999', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMounterFile) })
    );

    await page.goto('http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3&mock_scan=1');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = getMainMaterialInput(page);
    const slotInput = getMainSlotInput(page);

    // scan first material → slot 10008-L
    await materialInput.fill('DUP-DETAIL-PACK-A');
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill('10008-L');
    await slotInput.press('Enter');
    await expect(materialInput).toBeFocused({ timeout: 5000 });

    // scan second material → slot 10009-R
    await materialInput.fill('DUP-DETAIL-PACK-B');
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill('10009-R');
    await slotInput.press('Enter');
    await expect(materialInput).toBeFocused({ timeout: 5000 });

    // verify initial state: both rows have their pack codes
    const row10008L = page.locator('[row-id="10008-L"]');
    const row10009R = page.locator('[row-id="10009-R"]');
    await expect(row10008L.locator('[col-id="materialInventoryIdno"]')).toContainText('DUP-DETAIL-PACK-A');
    await expect(row10009R.locator('[col-id="materialInventoryIdno"]')).toContainText('DUP-DETAIL-PACK-B');

    // trigger S5555 unload mode
    await materialInput.fill('S5555');
    await materialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);

    const unloadMaterialInput = page.locator('#detail-unload-material-input');
    const unloadSlotInput = page.locator('#detail-unload-slot-input');
    await expect(unloadMaterialInput).toBeVisible({ timeout: 5000 });

    // scanning DUP-DETAIL-PACK-A uniquely finds 10008-L (not "多個站位" error)
    await unloadMaterialInput.fill('DUP-DETAIL-PACK-A');
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(row10008L.locator('[col-id="correct"]')).toContainText('⛔', { timeout: 5000 });

    // scan replacement pack code (mock mode → auto MATCHED, slot input focused)
    await unloadMaterialInput.fill('DUP-DETAIL-REPLACE');
    await unloadMaterialInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(unloadSlotInput).toBeFocused({ timeout: 5000 });

    // confirm slot → row shows ✅, unload mode exits automatically
    await unloadSlotInput.fill('10008-L');
    await unloadSlotInput.press('Enter');
    await waitVisualStepIfNeeded(page, testInfo);
    await expect(row10008L.locator('[col-id="correct"]')).toContainText('✅', { timeout: 5000 });
    await expect(unloadMaterialInput).not.toBeVisible();
});

