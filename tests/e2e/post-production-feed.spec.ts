import { test, expect } from '@playwright/test'
import { FEED_SCENARIOS } from './fixtures/postProductionFixtures'
import { setupFutureExpiryAuthToken } from './helpers/auth'
import { ProductionPage } from './pages/ProductionPage'

test.beforeEach(async ({ page }) => {
  await setupFutureExpiryAuthToken(page)
})

for (const scenario of FEED_SCENARIOS) {
  const label = `[${scenario.machine}][${scenario.mode}]`

  test.describe(label, () => {
    test('正常上料：掃料 → 掃站位 → grid 更新', async ({ page }) => {
      const po = new ProductionPage(page, scenario.machine)
      await po.mockApis(scenario)
      await po.goto(scenario.productionUuid, { testingMode: scenario.mode === 'testing' })

      await po.scanMaterialAndSlot(scenario.materialPackCode, scenario.slotIdno)

      // 正常上料的成功訊息由 MaterialInventoryBarcodeInput 用原生 message.success() 顯示（無 testid）
      // 以 grid row 的 appendedMaterialInventoryIdno 欄位作為驗證依據
      const row = po.row(scenario.expectedRowId)
      await expect(
        row.locator('[col-id="appendedMaterialInventoryIdno"]')
      ).toContainText(scenario.materialPackCode, { timeout: 10000 })
    })

    test('巡檢掃描：掃 S5588 進入巡檢模式，再掃同包料同站位', async ({ page }) => {
      const po = new ProductionPage(page, scenario.machine)
      await po.mockApis(scenario)
      await po.goto(scenario.productionUuid, { testingMode: scenario.mode === 'testing' })

      // 先正常上料，等 grid 更新確認完成
      await po.scanMaterialAndSlot(scenario.materialPackCode, scenario.slotIdno)
      const row = po.row(scenario.expectedRowId)
      await expect(
        row.locator('[col-id="appendedMaterialInventoryIdno"]')
      ).toContainText(scenario.materialPackCode, { timeout: 10000 })

      // 掃 S5588 進入巡檢模式
      await po.enterIpqcMode()

      // 巡檢：掃料 → 掃站位；IPQC 成功訊息由 useUiNotifier 發出，有 data-testid="success-message"
      await po.scanIpqcMaterialAndSlot(scenario.materialPackCode, scenario.slotIdno)
      await expect(page.getByTestId('success-message').last()).toBeVisible({ timeout: 10000 })
    })
  })
}
