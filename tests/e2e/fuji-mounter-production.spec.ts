import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    // 呼叫真實 login API，取得有效 token
    const loginRes = await page.request.post('http://localhost/api/session/login', {
        form: { username: 'operator', password: 'operatorpassword' },
    });
    if (!loginRes.ok()) {
        const body = await loginRes.text();
        throw new Error(`Login failed (${loginRes.status()}): ${body.substring(0, 300)}`);
    }
    const { access_token, token_type } = await loginRes.json();

    // 在頁面載入前注入至 localStorage
    await page.addInitScript(({ access_token, token_type }) => {
        localStorage.setItem('authorized', JSON.stringify({
            OAuth2PasswordBearer: {
                schema: { flow: 'password', tokenUrl: '', scopes: {}, type: 'oauth2' },
                token: { access_token, token_type },
                username: 'operator',
            },
            HTTPBasic: null,
        }));
    }, { access_token, token_type });
});

test('Fuji mounter assistant material appending', async ({ page }) => {
    // 1. 導航至一個已存在的生產頁面
    // 注意：此 UUID 需要來自您的測試資料庫或 Seeding 過程
    const productionUuid = 'a3b8f2c1-a1b1-4c1b-8c1e-111111111111';
    await page.goto(`/smt/fuji-mounter-production/${productionUuid}`);

    // 等待頁面與 AG Grid 表格載入完成
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();

    // 定義測試用資料
    const materialPackCode = 'VNT-2308030001'; // 一個應能匹配到槽位的物料
    const slotIdno = 'XP2B1-A-25'; // 物料的目標槽位

    // 2. 定位並填寫物料輸入框
    const materialInput = page.getByTestId('material-input');
    await materialInput.fill(materialPackCode);
    await materialInput.press('Enter');

    // 3. 等待物料掃描成功的訊息
    await expect(page.locator('.n-message')).toContainText('掃描成功');

    // 4. 定位並填寫槽位輸入框
    const slotInput = page.getByPlaceholder('請掃描槽位');
    await slotInput.fill(slotIdno);
    await slotInput.press('Enter');

    // 5. 等待槽位驗證成功的訊息
    await expect(page.locator('.n-message')).toContainText('驗證成功');

    // 6. 驗證表格資料已更新
    // 使用 AG Grid 的 row-id 定位特定資料列
    const row = page.locator(`[row-id="${slotIdno}"]`);

    // 檢查 'correct' 欄位是否顯示成功圖示
    await expect(row.locator('[col-id="correct"]')).toContainText('✅');

    // 檢查 'appendedMaterialInventoryIdno' (接料代碼) 欄位是否包含剛掃描的物料
    await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText(materialPackCode);

    console.log("完成，Fuji 上料助手接料測試成功");
});