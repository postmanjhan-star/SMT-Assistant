import { test, expect } from '@playwright/test';

test('test scan panasonic mounter feed records in normal mode', async ({ page }) => {
    // ---------- 啟動瀏覽器並開啟頁面 ----------
    await page.goto('http://localhost/smt/panasonic-mounter');

    // ---------- 填工單號 ----------
    // 對應 Selenium: wait.until(EC.presence_of_element_located((By.ID, "workOrderIdnoInput")))
    const workOrderInput = page.locator('#workOrderIdnoInput');
    await workOrderInput.fill('ZZ9999');

    // ---------- 填成品料號 ----------
    // 對應 Selenium: wait.until(EC.presence_of_element_located((By.ID, "productIdnoInput")))
    const productInput = page.locator('#productIdnoInput');
    await productInput.fill('40Y85-010A-M3');

    // ⚠️ 等待 watch(productIdno) 觸發 API，載入機台選項
    // 對應 Selenium: time.sleep(2)
    await page.waitForTimeout(2000);

    // ---------- 選擇機台號（Naive UI n-select） ----------
    // 點開下拉
    // 對應 Selenium: EC.element_to_be_clickable((By.CSS_SELECTOR, ".n-select"))
    await page.locator('.n-select').click();

    // 選擇指定 option
    // 對應 Selenium: //div[contains(@class,'n-base-select-option') and text()='A1-NPM-W2']
    // Playwright 會自動等待元素出現並可點擊
    await page.locator('.n-base-select-option').filter({ hasText: 'A1-NPM-W2' }).click();

    // === radio: 工件面向 ===
    // 對應 Selenium: //input[@value='DUPLEX']
    // Naive UI 的 radio input 是隱藏的 (opacity: 0)，使用 force: true 來強制勾選
    await page.locator('input[value="DUPLEX"]').check({ force: true });

    // === radio: 機台面向 ===
    // 對應 Selenium: //input[@value='1+2']
    await page.locator('input[value="1+2"]').check({ force: true });

    // === 強制 blur，讓 lazy 生效 ===
    // 對應 Selenium: driver.execute_script("document.activeElement.blur()")
    await productInput.blur();

    // === 點擊提交 ===
    // 對應 Selenium: button.n-button--primary-type
    await page.locator('button.n-button--primary-type').click();

    // ---------- 等待 router.push 跳頁 ----------
    // 對應 Selenium: wait.until(EC.url_contains("/smt/panasonic-mounter/"))
    // 使用正則表達式匹配 /smt/panasonic-mounter/ 後面跟著任意字元 (如 UUID)
    await page.waitForURL(/\/smt\/panasonic-mounter\/.+/);

    console.log("表單提交完成，已跳轉頁面");
});

test('test scan panasonic mounter feed records in testing mode', async ({ page }) => {
    // ---------- 啟動瀏覽器並開啟頁面 ----------
    await page.goto('http://localhost/smt/panasonic-mounter');

    // ---------- 切換到試產生產模式 ----------
    // 點擊 Switch 切換模式
    await page.getByRole('switch').click();

    // ---------- 驗證欄位自動填寫 ----------
    // 驗證工單號與成品料號
    await expect(page.locator('#workOrderIdnoInput')).toHaveValue('ZZ9999');
    await expect(page.locator('#productIdnoInput')).toHaveValue('40Y85-009B-9');

    // 驗證機台號 (等待 API 回傳並渲染，toContainText 會自動重試)
    await expect(page.locator('.n-select')).toContainText('A1-NPM-W2');

    // 驗證 Radio Button (工件面向: DUPLEX -> B+T面, 機台面向: 1+2 -> 機台正反面)
    await expect(page.locator('.n-radio-button--checked').filter({ hasText: 'B+T面' })).toBeVisible();
    await expect(page.locator('.n-radio-button--checked').filter({ hasText: '機台正反面' })).toBeVisible();

    // === 點擊提交 ===
    await page.locator('button.n-button--primary-type').click();

    // ---------- 等待 router.push 跳頁 ----------
    // 驗證 URL 包含 testing_mode=1
    await page.waitForURL(/\/smt\/panasonic-mounter\/.*testing_mode=1/);

    console.log("試產模式表單提交完成，已跳轉頁面");
});