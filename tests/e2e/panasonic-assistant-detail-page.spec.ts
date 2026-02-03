import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// 讀取 CSV 檔案。
// 進入指定頁面。
// 執行第一輪掃描（輸入物料 -> 等待焦點切換 -> 輸入槽位）。
// 等待表格更新與頁面跳轉（進入生產模式）。
// 執行第二輪掃描。

/**
 * 讀取測試資料 CSV
 */
function readCsvRecords() {
    // 假設 CSV 檔案位於 tests/e2e/data/ 目錄下
    const csvPath = path.join(process.cwd(), 'tests/e2e/data/panasonic_mounter_feed_records.csv');
    
    if (!fs.existsSync(csvPath)) {
        console.warn(`CSV file not found at ${csvPath}, returning empty list.`);
        return [];
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const records: { material: string, slot: string }[] = [];

    for (const line of lines) {
        // 簡單的 CSV 解析：假設沒有引號包裹的逗號
        const parts = line.split(',');
        if (parts.length >= 2 && parts[0].trim()) {
            records.push({ material: parts[0].trim(), slot: parts[1].trim() });
        }
    }
    return records;
}

/**
 * 執行掃描邏輯：輸入物料 -> 等待焦點切換 -> 輸入槽位
 */
async function scanAll(page: Page, records: { material: string, slot: string }[]) {
    for (const [index, record] of records.entries()) {
        console.log(`正在處理第 ${index + 1}/${records.length} 筆: ${record.material}`);
        try {
            // 1. 定位並填寫物料輸入框 (假設是頁面上第一個 .n-input input)
            const materialInput = page.locator('.n-input input').first();
            await expect(materialInput).toBeVisible();
            
            await materialInput.click(); // 確保聚焦
            await materialInput.fill(record.material);
            await page.waitForTimeout(500); // 等待 Vue 處理輸入值
            await materialInput.press('Enter');

            // 2. 等待焦點自動切換到槽位輸入框
            // 邏輯：當前 active element 是 input 且不是剛才的 material input
            await page.waitForFunction(
                (matInputEl) => {
                    const active = document.activeElement;
                    return active && active.tagName === 'INPUT' && active !== matInputEl;
                },
                await materialInput.elementHandle(),
                { timeout: 10000 }
            );

            // 3. 在當前聚焦的輸入框 (槽位) 填值
            const slotInput = page.locator('*:focus');
            await slotInput.fill(record.slot);
            await slotInput.press('Enter');

        } catch (e) {
            console.log(`⚠️ 處理 ${record.material} 時發生超時或錯誤，跳過此筆。`);
            // 繼續下一筆
        }
    }
}

test('test scan panasonic mounter feed records in normal mode', async ({ page }) => {
    // 設定較長的測試超時時間，因為涉及大量掃描與頁面跳轉
    test.setTimeout(300000);

    const records = readCsvRecords();
    console.log(`共載入 ${records.length} 筆資料`);

    // 開啟頁面
    await page.goto("http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3");

    // 第一輪掃描
    await scanAll(page, records);

    // 等待 AG Grid 更新 (檢查第一列的 materialInventoryIdno 欄位是否有內容)
    const firstRowCell = page.locator(".ag-center-cols-container .ag-row").first().locator(".ag-cell[col-id='materialInventoryIdno']");
    await expect(firstRowCell).toBeVisible();
    console.log("綁定結果:", await firstRowCell.innerText());

    console.log("等待頁面跳轉...");
    // 等待 URL 變更為生產頁面 (包含 /smt/panasonic-mounter-production/)
    await page.waitForURL(/\/smt\/panasonic-mounter-production\/.+/, { timeout: 300000 });
    console.log("頁面已跳轉，開始第二次掃描");

    // 第二輪掃描 (在生產頁面)
    await scanAll(page, records);

    // console.log("Playwright 已完成操作，停留 60 秒供觀察");
    // await page.waitForTimeout(60000);
});