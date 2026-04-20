import { test, expect } from '@playwright/test'
import { setupFutureExpiryAuthToken } from './helpers/auth'
import { expectLatestMessage } from './helpers/scan'
import { ProductionPage } from './pages/ProductionPage'

const PRODUCTION_UUID = 'ipqc-panasonic-happy'
const ROW_ID = '10008-L'
const MATERIAL_PACK = 'PACK-L'
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
      material_pack_code: MATERIAL_PACK,
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

test('panasonic production ipqc: S5588 進入覆檢 → 掃料+站位 → 上傳 INSPECTION 記錄', async ({ page }) => {
  const mockStats = [buildMockStat()]

  await page.route(`**/api/smt/panasonic_mounter_item/stats/${PRODUCTION_UUID}`, (route) =>
    route.fulfill({ json: mockStats })
  )
  await page.route(`**/api/smt/panasonic_mounter_item/stats/logs/${PRODUCTION_UUID}`, (route) =>
    route.fulfill({ json: [] })
  )
  await page.route('**/api/smt/material_inventory/**', (route) =>
    route.fulfill({
      json: { id: 1, idno: MATERIAL_PACK, material_idno: MATERIAL_IDNO, material_name: 'TEST' },
    })
  )

  const inspectionRequests: any[] = []
  await page.route('**/api/smt/panasonic_mounter_item/stat/roll', async (route) => {
    const request = route.request()
    if (request.method() !== 'POST') return route.continue()
    const body = request.postDataJSON()
    if (body?.feed_material_pack_type === 'INSPECTION_MATERIAL_PACK') {
      inspectionRequests.push(body)
    }
    return route.fulfill({ json: {} })
  })

  const po = new ProductionPage(page, 'panasonic')
  await po.goto(PRODUCTION_UUID)

  await po.enterIpqcMode()
  await po.scanIpqcMaterialAndSlot(MATERIAL_PACK, ROW_ID)

  await expect(page.getByTestId('success-message').last()).toBeVisible({ timeout: 10000 })

  await expect
    .poll(() => inspectionRequests.length, { timeout: 10000 })
    .toBeGreaterThanOrEqual(1)

  const req = inspectionRequests[0]
  expect(req.material_pack_code).toBe(MATERIAL_PACK)
  expect(req.slot_idno).toBe('10008')
  expect(req.sub_slot_idno).toBe('L')
})

test('panasonic production ipqc: 掃 S5588 再按一次應退出覆檢模式', async ({ page }) => {
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

  await po.enterIpqcMode()
  await expect(po.ipqcMaterialInput).toBeVisible()

  await po.ipqcMaterialInput.fill('S5588')
  await po.ipqcMaterialInput.press('Enter')

  await expect(po.materialInput).toBeVisible({ timeout: 5000 })
  await expect(po.ipqcMaterialInput).not.toBeVisible()
})

test('panasonic production ipqc: 掃錯站位顯示錯誤且不上傳', async ({ page }) => {
  const mockStats = [buildMockStat()]

  await page.route(`**/api/smt/panasonic_mounter_item/stats/${PRODUCTION_UUID}`, (route) =>
    route.fulfill({ json: mockStats })
  )
  await page.route(`**/api/smt/panasonic_mounter_item/stats/logs/${PRODUCTION_UUID}`, (route) =>
    route.fulfill({ json: [] })
  )
  await page.route('**/api/smt/material_inventory/**', (route) =>
    route.fulfill({
      json: { id: 1, idno: MATERIAL_PACK, material_idno: MATERIAL_IDNO, material_name: 'TEST' },
    })
  )

  const inspectionRequests: any[] = []
  await page.route('**/api/smt/panasonic_mounter_item/stat/roll', async (route) => {
    const request = route.request()
    if (request.method() !== 'POST') return route.continue()
    const body = request.postDataJSON()
    if (body?.feed_material_pack_type === 'INSPECTION_MATERIAL_PACK') {
      inspectionRequests.push(body)
    }
    return route.fulfill({ json: {} })
  })

  const po = new ProductionPage(page, 'panasonic')
  await po.goto(PRODUCTION_UUID)

  await po.enterIpqcMode()
  await po.ipqcMaterialInput.fill(MATERIAL_PACK)
  await po.ipqcMaterialInput.press('Enter')
  await expect(po.ipqcSlotInput).toBeEnabled({ timeout: 5000 })

  await po.ipqcSlotInput.fill('99999-Z')
  await po.ipqcSlotInput.press('Enter')

  await expectLatestMessage(page, 'error-message', /找不到|站位/)
  expect(inspectionRequests.length).toBe(0)
})
