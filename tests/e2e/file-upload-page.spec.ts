import { test, expect } from '@playwright/test';
import path from 'path';

test('test panasonic mounter file upload', async ({ page }) => {
    // ---------- 啟動瀏覽器並開啟頁面 ----------
    // Playwright 的 page fixture 已經代表了一個開啟的瀏覽器分頁
    await page.goto('http://localhost/smt/file-manager');

    // ---------- 點擊「上傳 CSV/FST 檔案」按鈕 ----------
    // 對應 Selenium: //button[contains(., '上傳 CSV/FST 檔案')]
    // 使用 getByRole 定位按鈕，這比 XPath 更具語意且穩定
    await page.getByRole('button', { name: '上傳 CSV/FST 檔案' }).click();

    // ---------- 等待 router.push 跳頁到上傳頁面 ----------
    // 對應 Selenium: wait.until(EC.url_contains("/smt/file-upload"))
    await page.waitForURL('**/smt/file-upload');

    // ---------- 上傳 CSV 檔案 ----------
    // CSV 檔案路徑
    // 注意：這裡假設執行測試時的根目錄與 Python 腳本相同
    const csvFileName = '40Y85-010A-UPLOAD_TEST-B+T.csv';
    const csvPath = path.resolve(process.cwd(), `./tests/e2e/data/${csvFileName}`);

    // 等待 input[type=file] 出現並上傳檔案
    // 對應 Selenium: EC.presence_of_element_located((By.XPATH, "//input[@type='file']"))
    // Playwright 的 setInputFiles 會自動處理等待並上傳，即使 input 是隱藏的 (Naive UI 常見情況)
    await page.locator('input[type="file"]').setInputFiles(csvPath);

    // 等待檔案出現在 Naive UI 的上傳列表中 (確認檔案已被選取)
    // 對應 Selenium: //*[contains(text(), '{csv_path.name}')]
    await expect(page.getByText(csvFileName)).toBeVisible();

    // ---------- 填寫版次 ----------
    // 對應 Selenium: input#product_ver
    // Naive UI 的 Input 內部通常會有一個實際的 input 標籤
    const productVerInput = page.locator('input#product_ver');
    await productVerInput.click();
    await productVerInput.fill('UPLOAD_TEST');

    // ---------- 點擊最終的上傳按鈕 ----------
    // 對應 Selenium: //button/span[contains(text(), '上傳')]
    // 這裡使用 getByRole 搭配 name 過濾，通常能準確抓到按鈕
    await page.getByRole('button', { name: '上傳' }).click();

    // ---------- 等待上傳完成的成功訊息 ----------
    // 對應 Selenium: //div[contains(@class, 'n-message') and contains(., '成功')]
    // Naive UI 的全域訊息通常帶有 .n-message class
    await expect(page.locator('.n-message')).toContainText('成功');

    console.log("完成，Panasonic CSV 打件檔已上傳成功");
});

test('test fuji mounter file upload', async ({ page }) => {
    // ---------- 啟動瀏覽器並開啟頁面 ----------
    await page.goto('http://localhost/smt/file-manager');

    // ---------- 點擊「上傳 CSV/FST 檔案」按鈕 ----------
    await page.getByRole('button', { name: '上傳 CSV/FST 檔案' }).click();

    // ---------- 等待 router.push 跳頁到上傳頁面 ----------
    await page.waitForURL('**/smt/file-upload');

    // ---------- 上傳 FST 檔案 ----------
    const fstFileName = '40X85-010A-UPLOAD_TEST-XP2B1-B.fst';
    const fstPath = path.resolve(process.cwd(), `./tests/e2e/data/${fstFileName}`);

    // 等待 input[type=file] 出現並上傳檔案
    await page.locator('input[type="file"]').setInputFiles(fstPath);

    // 等待檔案出現在 Naive UI 的上傳列表中
    await expect(page.getByText(fstFileName)).toBeVisible();

    // ---------- 填寫 BOM 版本 ----------
    const productVerInput = page.locator('input#product_ver');
    await productVerInput.click();
    await productVerInput.fill('TEST_UPLOAD');

    // ---------- 點擊最終的上傳按鈕 ----------
    await page.getByRole('button', { name: '上傳' }).click();

    // ---------- 等待上傳完成的成功訊息 ----------
    await expect(page.locator('.n-message')).toContainText('成功');

    console.log("完成，FST 打件檔已上傳成功");
});

test('test panasonic mounter file upload with 3DASH file', async ({ page }) => {
    await page.goto('http://localhost/smt/file-manager');
    await page.getByRole('button', { name: '上傳 CSV/FST 檔案' }).click();
    await page.waitForURL('**/smt/file-upload');

    const csvFileName = '40Y85-010A-3DASH_UPLOAD_TEST-B+T.csv';
    const csvPath = path.resolve(process.cwd(), `./tests/e2e/data/${csvFileName}`);

    await page.locator('input[type="file"]').setInputFiles(csvPath);
    await expect(page.getByText(csvFileName)).toBeVisible();

    const productVerInput = page.locator('input#product_ver');
    await productVerInput.click();
    await productVerInput.fill('3DASH_PANA_TEST');

    await page.getByRole('button', { name: '上傳' }).click();
    await expect(page.locator('.n-message')).toContainText('成功');
});

test('test fuji mounter file upload with 3DASH file', async ({ page }) => {
    await page.goto('http://localhost/smt/file-manager');
    await page.getByRole('button', { name: '上傳 CSV/FST 檔案' }).click();
    await page.waitForURL('**/smt/file-upload');

    const fstFileName = '40X85-010A-3DASH_UPLOAD_TEST-XP2B1-B.fst';
    const fstPath = path.resolve(process.cwd(), `./tests/e2e/data/${fstFileName}`);

    await page.locator('input[type="file"]').setInputFiles(fstPath);
    await expect(page.getByText(fstFileName)).toBeVisible();

    const productVerInput = page.locator('input#product_ver');
    await productVerInput.click();
    await productVerInput.fill('3DASH_FUJI_TEST');

    await page.getByRole('button', { name: '上傳' }).click();
    await expect(page.locator('.n-message')).toContainText('成功');
});
