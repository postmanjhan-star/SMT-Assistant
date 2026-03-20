import { Page, expect } from '@playwright/test'
import { FeedScenario } from '../fixtures/postProductionFixtures'

type Machine = 'fuji' | 'panasonic'

export class ProductionPage {
  constructor(private page: Page, private machine: Machine) {}

  async mockApis(scenario: FeedScenario) {
    const m = this.machine
    const uuid = scenario.productionUuid
    const statsUrl =
      m === 'fuji'
        ? `**/api/smt/fuji_mounter_item/stats/${uuid}`
        : `**/api/smt/panasonic_mounter_item/stats/${uuid}`
    const logsUrl =
      m === 'fuji'
        ? `**/api/smt/fuji_mounter_item/stats/logs/${uuid}`
        : `**/api/smt/panasonic_mounter_item/stats/logs/${uuid}`
    const uploadUrl =
      m === 'fuji'
        ? '**/api/smt/fuji_mounter_item/stat/roll'
        : '**/api/smt/panasonic_mounter_item/stat/roll'

    await this.page.route(statsUrl, (route) =>
      route.fulfill({ json: scenario.mockStats })
    )
    await this.page.route(logsUrl, (route) => route.fulfill({ json: [] }))
    await this.page.route('**/api/smt/material_inventory/**', (route) =>
      route.fulfill({ json: scenario.mockMaterial })
    )
    await this.page.route(uploadUrl, (route) => route.fulfill({ json: {} }))
  }

  async goto(productionUuid: string, options: { testingMode?: boolean } = {}) {
    let url =
      this.machine === 'fuji'
        ? `/smt/fuji-mounter-production/${productionUuid}`
        : `/smt/panasonic-mounter-production/${productionUuid}`
    if (options.testingMode) url += '?testing_mode=1'
    await this.page.goto(url)
    await this.page.locator('.ag-root-wrapper').waitFor({ state: 'visible' })
  }

  get materialInput() {
    const testId =
      this.machine === 'fuji'
        ? 'fuji-production-material-input'
        : 'panasonic-main-material-input'
    return this.page.getByTestId(testId).locator('input')
  }

  get slotInput() {
    const testId =
      this.machine === 'fuji'
        ? 'fuji-production-slot-input'
        : 'panasonic-main-slot-input'
    return this.page.getByTestId(testId).locator('input')
  }

  get unloadMaterialInput() {
    const testId =
      this.machine === 'fuji' ? 'fuji-unload-material-input' : 'unload-material-input'
    return this.page.getByTestId(testId)
  }

  get unloadSlotInput() {
    const testId =
      this.machine === 'fuji' ? 'fuji-unload-slot-input' : 'unload-slot-input'
    return this.page.getByTestId(testId)
  }

  get exitUnloadBtn() {
    const testId =
      this.machine === 'fuji' ? 'fuji-exit-unload-mode-btn' : 'exit-unload-mode-btn'
    return this.page.getByTestId(testId)
  }

  get operationTag() {
    const testId =
      this.machine === 'fuji' ? 'fuji-operation-tag' : 'panasonic-operation-tag'
    return this.page.getByTestId(testId)
  }

  row(rowId: string) {
    return this.page.locator(`[row-id="${rowId}"]`)
  }

  async scanMaterialAndSlot(materialPackCode: string, slotIdno: string) {
    await this.materialInput.click()
    await this.materialInput.fill(materialPackCode)
    await this.materialInput.press('Enter')
    await expect(this.slotInput).toBeFocused({ timeout: 10000 }).catch(() => {})
    await this.slotInput.fill(slotIdno)
    await this.slotInput.press('Enter')
  }
}
