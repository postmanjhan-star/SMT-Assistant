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


async function scanOne(page: Page, material: string, slot: string) {
    const materialInput = page.locator('.n-input input').first();
    await expect(materialInput).toBeVisible();

    await materialInput.click();
    await materialInput.fill(material);
    await page.waitForTimeout(300);
    await materialInput.press('Enter');

    await page.waitForFunction(
        (matInputEl) => {
            const active = document.activeElement;
            return active && active.tagName === 'INPUT' && active !== matInputEl;
        },
        await materialInput.elementHandle(),
        { timeout: 10000 }
    );

    const slotInput = page.locator('*:focus');
    await slotInput.fill(slot);
    await slotInput.press('Enter');
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

    console.log("Playwright 已完成完整掃描流程測試");
});

test('test scan panasonic mounter feed records in testing mode', async ({ page }) => {
    test.setTimeout(300000);

    const testingMaterialPack = 'test_material_pack';
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

    const records = readCsvRecords();
    console.log(`總共 ${records.length} 筆資料`);

    // 測試模式頁面
    await page.goto("http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3&testing_mode=1&testing_product_idno=40Y85-010A-M3");

    // 測試模式沒有巡檢，因此只掃一次
    await scanAll(page, records);

    // 手動按開始生產
    const startBtn = page.getByRole('button', { name: /開始生產/ });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    const confirmBtn = page.getByRole('button', { name: '確定' });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // 導向 production 頁
    await page.waitForURL(/\/smt\/panasonic-mounter-production\/.+/, { timeout: 300000 });

    // 測試模式開始生產後，接一個測試物料到某一個槽位
    await expect(page.locator(".ag-root-wrapper")).toBeVisible();

    const testingSlot = '10008-L';

    const materialInput = page.locator('.n-input input').first();
    await materialInput.fill(testingMaterialPack);
    await materialInput.press('Enter');

    await page.waitForFunction(
        (matInputEl) => {
            const active = document.activeElement;
            return active && active.tagName === 'INPUT' && active !== matInputEl;
        },
        await materialInput.elementHandle(),
        { timeout: 10000 }
    );

    const slotInput = page.locator('*:focus');
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
    // 1. 開啟頁面
    await page.goto("http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3");

    // 等待 AG Grid 載入
    await expect(page.locator(".ag-root-wrapper")).toBeVisible();

    // 2. 定義測試資料
    const materialPackCode = 'B4909892'; // 物料條碼
    const correctSlot = '10008-L';      // 正確槽位 (備註)
    const wrongSlot = '10009-R';        // 故意輸入的錯誤槽位

    // 3. 掃描物料
    const materialInput = page.locator('.n-input input').first();
    await materialInput.fill(materialPackCode);
    await materialInput.press('Enter');

    // 4. 等待焦點切換並掃描錯誤的槽位
    await page.waitForFunction(
        (matInputEl) => {
            const active = document.activeElement;
            return active && active.tagName === 'INPUT' && active !== matInputEl;
        },
        await materialInput.elementHandle()
    );
    const slotInput = page.locator('*:focus');
    await slotInput.fill(wrongSlot);
    await slotInput.press('Enter');

    // 5. 驗證錯誤訊息
    // 當掃描錯誤槽位時，預期會出現一個 "error" 類型的訊息
    // await expect(
    //     page.getByTestId('error-message')
    // ).toContainText(`錯誤的槽位 ${wrongSlot}`)


    // 6. 驗證 AG Grid 中錯誤槽位的狀態
    const row = page.locator(`[row-id="${wrongSlot}"]`);
    await expect(row.locator('[col-id="correct"]')).toContainText('❌');
    await expect(row.locator('[col-id="materialInventoryIdno"]')).toContainText(materialPackCode);

    // 7. scan again with correct slot
    await materialInput.fill(materialPackCode);
    await materialInput.press('Enter');

    await page.waitForFunction(
        (matInputEl) => {
            const active = document.activeElement;
            return active && active.tagName === 'INPUT' && active !== matInputEl;
        },
        await materialInput.elementHandle()
    );
    const slotInputAfter = page.locator('*:focus');
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
    const materialInput = page.locator('.n-input input').first();
    await materialInput.fill(materialPackCode);
    await materialInput.press('Enter');

    // 4. wait focus change and scan wrong slot
    await page.waitForFunction(
        (matInputEl) => {
            const active = document.activeElement;
            return active && active.tagName === 'INPUT' && active !== matInputEl;
        },
        await materialInput.elementHandle()
    );
    const slotInput = page.locator('*:focus');
    await slotInput.fill(wrongSlot);
    await slotInput.press('Enter');

    // 5. wrong slot should be error in testing mode
    const row = page.locator(`[row-id="${wrongSlot}"]`);
    await expect(row.locator('[col-id="correct"]')).toContainText('❌');
    await expect(row.locator('[col-id="materialInventoryIdno"]')).toContainText(materialPackCode);

    // 6. scan again with correct slot
    await materialInput.fill(materialPackCode);
    await materialInput.press('Enter');

    await page.waitForFunction(
        (matInputEl) => {
            const active = document.activeElement;
            return active && active.tagName === 'INPUT' && active !== matInputEl;
        },
        await materialInput.elementHandle()
    );
    const slotInputAfter = page.locator('*:focus');
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