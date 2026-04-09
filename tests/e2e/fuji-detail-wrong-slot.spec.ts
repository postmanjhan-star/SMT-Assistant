import { test, expect, Page } from '@playwright/test';
import { setupFutureExpiryAuthToken } from './helpers/auth';

const FUJI_URL = 'http://localhost/smt/fuji-mounter/XP2B1/ZZ9999?product_idno=40X85-009B-TEST_SCAN&work_sheet_side=TOP';
const FUJI_TESTING_URL = 'http://localhost/smt/fuji-mounter/XP2B1/ZZ9999?product_idno=40X85-009B-TEST_SCAN&work_sheet_side=TOP&testing_mode=1&testing_product_idno=40X85-009B-TEST_SCAN';

const GRID_FIXTURE = [
    {
        mounter_idno: 'XP2B1',
        board_side: 'TOP',
        fuji_mounter_file_items: [
            { stage: 'A', slot: 9,  part_number: 'TEST-MAT-B4933598' },
            { stage: 'A', slot: 11, part_number: 'OTHER-MAT' },
        ],
    },
];

const MATERIAL_FIXTURE = {
    id: 1,
    idno: 'B4933598',
    material_id: 1,
    material_idno: 'TEST-MAT-B4933598',
    material_name: 'Test Material B4933598',
};

const materialPackCode = 'B4933598';
const correctSlot = 'XP2B1-A-9';
const wrongSlot = 'XP2B1-A-11';

async function setupMocks(page: Page) {
    await page.route('**/smt/fuji_mounter/ZZ9999**', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(GRID_FIXTURE) })
    );
    await page.route('**/smt/material_inventory/B4933598**', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MATERIAL_FIXTURE) })
    );
}

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    await setupFutureExpiryAuthToken(page);
});

test('fuji wrong slot scan in normal mode: S5577 force-unload then re-scan to correct slot', async ({ page }) => {
    // mock_scan=1 uses MockNormalModeStrategy which bypasses matchedRows.
    // Mock the material inventory endpoint so NormalModeStrategy runs with real slot matching.
    await setupMocks(page);
    await page.goto(FUJI_URL);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.getByTestId('fuji-detail-material-input').locator('input');
    const slotInput = page.getByTestId('fuji-detail-slot-input').locator('input');

    // 1. scan material → wrong slot → ❌
    await materialInput.fill(materialPackCode);
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill(wrongSlot);
    await slotInput.press('Enter');

    await expect(page.locator(`[row-id="${wrongSlot}"]`).locator('[col-id="correct"]')).toContainText('❌');
    await expect(page.locator(`[row-id="${wrongSlot}"]`).locator('[col-id="materialInventoryIdno"]')).toContainText(materialPackCode);

    // 2. S5577 force-unload to clear the duplicate-scan guard
    //    (re-scanning directly is blocked because the barcode is still "in grid")
    await materialInput.fill('S5577');
    await materialInput.press('Enter');
    const unloadSlotInput = page.locator('#detail-unload-slot-input');
    await expect(unloadSlotInput).toBeFocused({ timeout: 5000 });
    await unloadSlotInput.fill(wrongSlot);
    await unloadSlotInput.press('Enter');
    // exit force-unload mode by scanning S5577 again in the unload material input
    const unloadMaterialInput = page.locator('#detail-unload-material-input');
    await expect(unloadMaterialInput).toBeFocused({ timeout: 5000 });
    await unloadMaterialInput.fill('S5577');
    await unloadMaterialInput.press('Enter');

    // 3. re-scan to correct slot
    await materialInput.fill(materialPackCode);
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill(correctSlot);
    await slotInput.press('Enter');

    // 4. wrong slot should be cleared, correct slot should be updated
    await expect(
        page.locator(`[row-id="${wrongSlot}"]`).locator('[col-id="materialInventoryIdno"]')
    ).not.toContainText(materialPackCode);
    await expect(
        page.locator(`[row-id="${wrongSlot}"]`).locator('[col-id="correct"]')
    ).not.toContainText('❌');
    await expect(
        page.locator(`[row-id="${correctSlot}"]`).locator('[col-id="materialInventoryIdno"]')
    ).toContainText(materialPackCode);

    console.log('done: fuji wrong slot cleared and correct slot updated (S5577)');
});

test('fuji wrong material with S5555 換料卸除 then re-scan to correct slot', async ({ page }) => {
    await setupMocks(page);
    await page.goto(FUJI_URL);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.getByTestId('fuji-detail-material-input').locator('input');
    const slotInput = page.getByTestId('fuji-detail-slot-input').locator('input');

    // 1. scan material → wrong slot → ❌
    await materialInput.fill(materialPackCode);
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill(wrongSlot);
    await slotInput.press('Enter');

    await expect(page.locator(`[row-id="${wrongSlot}"]`).locator('[col-id="correct"]')).toContainText('❌');
    await expect(page.locator(`[row-id="${wrongSlot}"]`).locator('[col-id="materialInventoryIdno"]')).toContainText(materialPackCode);

    // 2. S5555 換料卸除: scan barcode in unload material input,
    //    system auto-finds the wrongly-loaded slot
    await materialInput.fill('S5555');
    await materialInput.press('Enter');
    const unloadMaterialInput = page.locator('#detail-unload-material-input');
    await expect(unloadMaterialInput).toBeFocused({ timeout: 5000 });
    await unloadMaterialInput.fill(materialPackCode);
    await unloadMaterialInput.press('Enter');
    // system finds XP2B1-A-11, unloads it, transitions to REPLACE_MATERIAL_SCAN

    // 3. exit unload mode without replacement (scan S5555 again — toggles off)
    await expect(unloadMaterialInput).toBeFocused({ timeout: 5000 });
    await unloadMaterialInput.fill('S5555');
    await unloadMaterialInput.press('Enter');

    // 4. re-scan to the correct slot
    await materialInput.fill(materialPackCode);
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill(correctSlot);
    await slotInput.press('Enter');

    // 5. wrong slot cleared, correct slot updated
    await expect(
        page.locator(`[row-id="${wrongSlot}"]`).locator('[col-id="materialInventoryIdno"]')
    ).not.toContainText(materialPackCode);
    await expect(
        page.locator(`[row-id="${wrongSlot}"]`).locator('[col-id="correct"]')
    ).not.toContainText('❌');
    await expect(
        page.locator(`[row-id="${correctSlot}"]`).locator('[col-id="materialInventoryIdno"]')
    ).toContainText(materialPackCode);

    console.log('done: fuji S5555 換料卸除 and re-scan to correct slot');
});

test('fuji wrong slot scan in testing mode: S5577 force-unload then re-scan to correct slot', async ({ page }) => {
    await setupMocks(page);
    await page.goto(FUJI_TESTING_URL);
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    const materialInput = page.getByTestId('fuji-detail-material-input').locator('input');
    const slotInput = page.getByTestId('fuji-detail-slot-input').locator('input');

    // 1. scan material → wrong slot → ❌ (TestingModeStrategy: matchedRows.length > 0 → decideSlotBinding)
    await materialInput.fill(materialPackCode);
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill(wrongSlot);
    await slotInput.press('Enter');

    await expect(page.locator(`[row-id="${wrongSlot}"]`).locator('[col-id="correct"]')).toContainText('❌');
    await expect(page.locator(`[row-id="${wrongSlot}"]`).locator('[col-id="materialInventoryIdno"]')).toContainText(materialPackCode);

    // 2. S5577 force-unload to clear the duplicate-scan guard
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
    await materialInput.fill(materialPackCode);
    await materialInput.press('Enter');
    await expect(slotInput).toBeFocused({ timeout: 10000 });
    await slotInput.fill(correctSlot);
    await slotInput.press('Enter');

    // 4. wrong slot cleared, correct slot shows ✅
    await expect(
        page.locator(`[row-id="${wrongSlot}"]`).locator('[col-id="materialInventoryIdno"]')
    ).not.toContainText(materialPackCode);
    await expect(
        page.locator(`[row-id="${wrongSlot}"]`).locator('[col-id="correct"]')
    ).not.toContainText('❌');
    await expect(
        page.locator(`[row-id="${correctSlot}"]`).locator('[col-id="materialInventoryIdno"]')
    ).toContainText(materialPackCode);
    await expect(
        page.locator(`[row-id="${correctSlot}"]`).locator('[col-id="correct"]')
    ).toContainText('✅');

    console.log('done: fuji testing mode wrong slot cleared and correct slot updated');
});
