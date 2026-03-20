import { test, expect } from '@playwright/test'
import { FEED_SCENARIOS } from './fixtures/postProductionFixtures'
import { ProductionPage } from './pages/ProductionPage'

for (const scenario of FEED_SCENARIOS) {
  const label = `[${scenario.machine}][${scenario.mode}]`

  test.describe(label, () => {
    test('正常上料：掃料 → 掃站位 → grid 更新', async ({ page }) => {
      const po = new ProductionPage(page, scenario.machine)
      await po.mockApis(scenario)
      await po.goto(scenario.productionUuid, { testingMode: scenario.mode === 'testing' })

      await po.scanMaterialAndSlot(scenario.materialPackCode, scenario.slotIdno)

      await expect(page.getByTestId('success-message').last()).toBeVisible()

      const row = po.row(scenario.expectedRowId)
      await expect(
        row.locator('[col-id="appendedMaterialInventoryIdno"]')
      ).toContainText(scenario.materialPackCode, { timeout: 10000 })
    })

    test('巡檢掃描：同包料再掃同站位', async ({ page }) => {
      const po = new ProductionPage(page, scenario.machine)
      await po.mockApis(scenario)
      await po.goto(scenario.productionUuid, { testingMode: scenario.mode === 'testing' })

      await po.scanMaterialAndSlot(scenario.materialPackCode, scenario.slotIdno)
      await expect(page.getByTestId('success-message').last()).toBeVisible()

      await po.scanMaterialAndSlot(scenario.materialPackCode, scenario.slotIdno)
      const secondMsg = page
        .getByTestId('info-message')
        .last()
        .or(page.getByTestId('success-message').last())
        .or(page.getByTestId('warning-message').last())
      await expect(secondMsg).toBeVisible({ timeout: 10000 })
    })
  })
}
