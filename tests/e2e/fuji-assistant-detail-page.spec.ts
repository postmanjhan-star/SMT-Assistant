import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

type ScanRecord = { material: string; slot: string };

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

async function getMaterialInput(page: Page, timeout = 30000) {
    const placeholderInput = page.locator("input[placeholder='½Ð±½´yª«®Æ']");
    try {
        await placeholderInput.first().waitFor({ state: 'visible', timeout: 3000 });
        return placeholderInput.first();
    } catch {
        const fallback = page.locator('.n-input input').first();
        await fallback.waitFor({ state: 'visible', timeout });
        return fallback;
    }
}

async function waitPageReady(page: Page, timeout = 30000) {
    await page.waitForLoadState('domcontentloaded');

    const currentUrl = page.url();
    await page.waitForFunction(
        (url) => location.href === url,
        currentUrl,
        { timeout }
    );

    const materialInput = await getMaterialInput(page, timeout);
    await expect(materialInput).toBeVisible({ timeout });
    await expect(materialInput).toBeEnabled({ timeout });
    await materialInput.click();
    return materialInput;
}

async function scanAll(page: Page, records: ScanRecord[]) {
    for (const [index, record] of records.entries()) {
        console.log(
            `Processing item ${index + 1}/${records.length}: ${record.material}`
        );

        try {
            const materialInput = await getMaterialInput(page, 10000);
            await materialInput.click();
            await materialInput.fill(record.material);
            await page.waitForTimeout(500);
            await materialInput.press('Enter');

            await page.waitForFunction(
                (matInputEl) => {
                    const active = document.activeElement as HTMLInputElement | null;
                    return (
                        !!active &&
                        active.tagName === 'INPUT' &&
                        active !== matInputEl
                    );
                },
                await materialInput.elementHandle(),
                { timeout: 10000 }
            );

            const slotInput = page.locator('*:focus');
            await slotInput.fill(record.slot);
            await slotInput.press('Enter');
        } catch (error) {
            console.log(
                `Timeout or UI not responding while processing ${record.material}. Skipping.`
            );
            continue;
        }
    }
}

test('scan fuji mounter feed records in normal mode', async ({ page }) => {
    test.setTimeout(300000);

    const records = readCsvRecords();
    console.log(`Loaded ${records.length} records in total.`);

    await page.goto(
        'http://localhost/smt/fuji-mounter/XP2B1/ZZ9999?product_idno=40X85-009B-TEST_SCAN&work_sheet_side=TOP&testing_mode&testing_product_idno'
    );

    await waitPageReady(page);

    await scanAll(page, records);

    const firstRowCell = page
        .locator('.ag-center-cols-container .ag-row')
        .first()
        .locator(".ag-cell[col-id='materialInventoryIdno'] .ag-cell-value");
    await expect(firstRowCell).toHaveText(/\S/, { timeout: 30000 });
    console.log('Binding result:', await firstRowCell.innerText());

    console.log('Waiting for page navigation...');
    const currentUrl = page.url();
    await page.waitForURL((url) => url.toString() !== currentUrl, {
        timeout: 300000,
    });

    await waitPageReady(page);
    console.log('Page has navigated. Continue scanning...');

    await scanAll(page, records);

    console.log('Playwright operations completed.');
});
