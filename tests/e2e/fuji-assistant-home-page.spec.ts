import { test, expect } from '@playwright/test';
import { setupAuthToken } from './helpers/auth';

test.beforeEach(async ({ page }) => {
    await setupAuthToken(page);
});

test('fuji home: normal mode — fill form and navigate to detail page', async ({ page }) => {
    await page.goto('http://localhost/smt/fuji-mounter');

    // 填工單號
    const workOrderInput = page.locator('#workOrderIdnoInput');
    await workOrderInput.fill('ZZ9999');

    // 填成品料號（等待 watch(productIdno) 觸發 API 載入線別選項）
    const productInput = page.locator('#productIdnoInput');
    await productInput.fill('40Y85-009B-T1');

    await page.waitForTimeout(2000);

    // 選擇線別（Naive UI n-select）
    await page.locator('.n-select').click();
    await page.locator('.n-base-select-option').filter({ hasText: 'XP2B1' }).click();

    // 選擇工件面向
    await page.locator('input[value="TOP"]').check({ force: true });

    // 強制 blur，讓 lazy binding 生效
    await productInput.blur();

    // 點擊提交
    await page.locator('button.n-button--primary-type').click();

    // 驗證跳轉到 detail 頁面
    await page.waitForURL(/\/smt\/fuji-mounter\/.+/);

    console.log('Fuji normal mode: 表單提交完成，已跳轉頁面');
});

test('fuji home: testing mode — auto-fill defaults and navigate with testing_mode=1', async ({ page }) => {
    await page.goto('http://localhost/smt/fuji-mounter');

    // 切換到試產生產模式
    await page.getByRole('switch').click();

    // 驗證欄位自動填寫
    await expect(page.locator('#workOrderIdnoInput')).toHaveValue('ZZ9999');
    await expect(page.locator('#productIdnoInput')).toHaveValue('40Y85-009B-T1');

    // 驗證線別（等待 API 回傳並渲染）
    await expect(page.locator('.n-select')).toContainText('XP2B1');

    // 驗證工件面向 radio 已選中 TOP
    await expect(page.locator('.n-radio-button--checked').filter({ hasText: 'TOP面' })).toBeVisible();

    // 點擊提交
    await page.locator('button.n-button--primary-type').click();

    // 驗證 URL 包含 testing_mode=1
    await page.waitForURL(/\/smt\/fuji-mounter\/.*testing_mode=1/);

    console.log('Fuji testing mode: 試產模式表單提交完成，已跳轉頁面');
});
