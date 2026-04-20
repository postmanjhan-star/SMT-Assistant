import { test, expect } from '@playwright/test'
import { setupFutureExpiryAuthToken } from './helpers/auth'
import { ProductionPage } from './pages/ProductionPage'

const PRODUCTION_UUID = 'splice-panasonic-happy'
const ROW_ID = '10008-L'
const INITIAL_PACK = 'PACK-OLD-L'
const SPLICE_NEW_PACK = 'PACK-NEW-L'
const MATERIAL_IDNO = '88120-0001-S0'

const buildMockStat = () => ({
  id: 1,
  uuid: PRODUCTION_UUID,
  created_at: '2024-01-01T00:00:00Z',
  production_start: '2024-01-01T00:00:00Z',
  production_end: null,
  work_order_no: 'ZZ9999',
  product_idno: '40Y85-010A-M3',
  machine_idno: 'A1-NPM-W2',
  machine_side: 'FRONT',
  board_side: 'DUPLEX',
  slot_idno: '10008',
  sub_slot_idno: 'L',
  material_idno: MATERIAL_IDNO,
  produce_mode: 'NORMAL_PRODUCE_MODE',
  feed_records: [
    {
      id: 1000,
      feed_record_id: 1000,
      operation_time: '2024-01-01T00:00:00Z',
      operation_type: 'FEED',
      material_pack_code: INITIAL_PACK,
      feed_material_pack_type: 'NEW_MATERIAL_PACK',
      check_pack_code_match: 'MATCHED_MATERIAL_PACK',
    },
  ],
})

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await setupFutureExpiryAuthToken(page)
})

test('panasonic production splice: S5566 → 舊料 → 新料 → 站位 送出 splice 上傳並更新 grid', async ({ page }) => {
  const mockStats = [buildMockStat()]

  await page.route(`**/api/smt/panasonic_mounter_item/stats/${PRODUCTION_UUID}`, (route) =>
    route.fulfill({ json: mockStats })
  )
  await page.route(`**/api/smt/panasonic_mounter_item/stats/logs/${PRODUCTION_UUID}`, (route) =>
    route.fulfill({ json: [] })
  )
  await page.route('**/api/smt/material_inventory/**', (route) =>
    route.fulfill({
      json: { id: 1, idno: SPLICE_NEW_PACK, material_idno: MATERIAL_IDNO, material_name: 'TEST' },
    })
  )

  const feedRequests: any[] = []
  const unfeedRequests: any[] = []
  await page.route('**/api/smt/panasonic_mounter_item/stat/roll', async (route) => {
    const request = route.request()
    if (request.method() !== 'POST') return route.continue()
    const body = request.postDataJSON()
    if (body?.operation_type === 'FEED') feedRequests.push(body)
    if (body?.operation_type === 'UNFEED') unfeedRequests.push(body)
    return route.fulfill({ json: {} })
  })

  const po = new ProductionPage(page, 'panasonic')
  await po.goto(PRODUCTION_UUID)

  const row = po.row(ROW_ID)
  await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText(INITIAL_PACK)

  await po.enterSpliceMode()

  await po.spliceMaterialInput.fill(INITIAL_PACK)
  await po.spliceMaterialInput.press('Enter')
  await expect(row.locator('[col-id="correct"]')).toContainText('⛔')

  await po.spliceMaterialInput.fill(SPLICE_NEW_PACK)
  await po.spliceMaterialInput.press('Enter')

  await expect(po.spliceSlotInput).toBeEnabled({ timeout: 5000 })
  await po.spliceSlotInput.click()
  await po.spliceSlotInput.fill(ROW_ID)
  await po.spliceSlotInput.press('Enter')

  await expect
    .poll(() => feedRequests.length, { timeout: 10000 })
    .toBeGreaterThanOrEqual(1)

  const spliceRequest = feedRequests.find((r) => r.material_pack_code === SPLICE_NEW_PACK)
  expect(spliceRequest).toBeTruthy()
  expect(spliceRequest?.slot_idno).toBe('10008')
  expect(spliceRequest?.sub_slot_idno).toBe('L')

  await expect(po.spliceMaterialInput).toBeVisible()
  await expect(row.locator('[col-id="correct"]')).toContainText('✅')
})

test('panasonic production splice: 接料中途退出還原 correct 狀態', async ({ page }) => {
  const mockStats = [buildMockStat()]

  await page.route(`**/api/smt/panasonic_mounter_item/stats/${PRODUCTION_UUID}`, (route) =>
    route.fulfill({ json: mockStats })
  )
  await page.route(`**/api/smt/panasonic_mounter_item/stats/logs/${PRODUCTION_UUID}`, (route) =>
    route.fulfill({ json: [] })
  )
  await page.route('**/api/smt/material_inventory/**', (route) =>
    route.fulfill({ json: {} })
  )
  await page.route('**/api/smt/panasonic_mounter_item/stat/roll', (route) =>
    route.fulfill({ json: {} })
  )

  const po = new ProductionPage(page, 'panasonic')
  await po.goto(PRODUCTION_UUID)

  const row = po.row(ROW_ID)
  await expect(row.locator('[col-id="correct"]')).toContainText('✅')

  await po.enterSpliceMode()
  await po.spliceMaterialInput.fill(INITIAL_PACK)
  await po.spliceMaterialInput.press('Enter')
  await expect(row.locator('[col-id="correct"]')).toContainText('⛔')

  await po.spliceMaterialInput.fill('S5566')
  await po.spliceMaterialInput.press('Enter')

  await expect(row.locator('[col-id="correct"]')).toContainText('✅')
  await expect(po.materialInput).toBeVisible()
})
