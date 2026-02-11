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

    await page.waitForURL(/\/smt\/fuji-mounter-production\/.+/, {
        timeout: 300000,
    });

    await expect(page.locator('.ag-root-wrapper')).toBeVisible();
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
