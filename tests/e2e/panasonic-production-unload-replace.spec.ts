import { test, expect } from '@playwright/test'
import { setupFutureExpiryAuthToken } from './helpers/auth'
import { expectLatestMessage } from './helpers/scan'
import { ProductionPage } from './pages/ProductionPage'

const PRODUCTION_UUID = 'unload-panasonic-happy'
const ROW_ID = '10008-L'
const INITIAL_PACK = 'PACK-L'
const REPLACEMENT_PACK = 'REPLACE-L'
const MATERIAL_IDNO = '88120-0001-S0'

const buildMockStat = (feedRecordSuffix = 'NORMAL_PACK') => ({
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
      feed_material_pack_type: feedRecordSuffix,
      check_pack_code_match: 'MATCHED_MATERIAL_PACK',
    },
  ],
})

const mockMaterialInventory = (page: any, pack: string) =>
  page.route(`**/api/smt/material_inventory/**`, (route: any) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith(`/${pack}`)) {
      return route.fulfill({
        json: { id: 1, idno: pack, material_idno: MATERIAL_IDNO, material_name: 'TEST' },
      })
    }
    return route.fulfill({
      json: { id: 1, idno: pack, material_idno: MATERIAL_IDNO, material_name: 'TEST' },
    })
  })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await setupFutureExpiryAuthToken(page)
})

test('panasonic production unload/replace: S5555 → 卸料 → 新料 → 確認站位 → unfeed + feed 上傳', async ({ page }) => {
  const mockStats = [buildMockStat('NEW_MATERIAL_PACK')]

  await page.route(`**/api/smt/panasonic_mounter_item/stats/${PRODUCTION_UUID}`, (route) =>
    route.fulfill({ json: mockStats })
  )
  await page.route(`**/api/smt/panasonic_mounter_item/stats/logs/${PRODUCTION_UUID}`, (route) =>
    route.fulfill({ json: [] })
  )
  await mockMaterialInventory(page, REPLACEMENT_PACK)

  const feedRequests: any[] = []
  const unfeedRequests: any[] = []
  await page.route('**/api/smt/panasonic_mounter_item/stat/roll', async (route) => {
    const request = route.request()
    if (request.method() !== 'POST') return route.continue()
    const body = request.postDataJSON()
    if (body?.operation_type === 'UNFEED') unfeedRequests.push(body)
    if (body?.operation_type === 'FEED') feedRequests.push(body)
    return route.fulfill({ json: {} })
  })

  const po = new ProductionPage(page, 'panasonic')
  await po.goto(PRODUCTION_UUID)

  const row = po.row(ROW_ID)
  await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText(INITIAL_PACK)

  await po.enterUnloadMode()
  await expect(po.unloadMaterialInput).toBeVisible()

  await po.unloadMaterialInput.fill(INITIAL_PACK)
  await po.unloadMaterialInput.press('Enter')

  await expect.poll(() => unfeedRequests.length, { timeout: 10000 }).toBeGreaterThanOrEqual(1)
  expect(unfeedRequests[0]).toEqual(
    expect.objectContaining({
      slot_idno: '10008',
      sub_slot_idno: 'L',
      material_pack_code: INITIAL_PACK,
      operation_type: 'UNFEED',
    })
  )
  await expect(row.locator('[col-id="correct"]')).toContainText('⛔')

  await po.unloadMaterialInput.fill(REPLACEMENT_PACK)
  await po.unloadMaterialInput.press('Enter')
  await expect(po.unloadSlotInput).toBeFocused({ timeout: 5000 })

  await po.unloadSlotInput.fill(ROW_ID)
  await po.unloadSlotInput.press('Enter')

  await expect.poll(() => feedRequests.length, { timeout: 10000 }).toBeGreaterThanOrEqual(1)
  expect(feedRequests[0]).toEqual(
    expect.objectContaining({
      slot_idno: '10008',
      sub_slot_idno: 'L',
      material_pack_code: REPLACEMENT_PACK,
      operation_type: 'FEED',
    })
  )

  await expect(row.locator('[col-id="correct"]')).toContainText('✅')
  await expect(row.locator('[col-id="appendedMaterialInventoryIdno"]')).toContainText(REPLACEMENT_PACK)
})

test('panasonic production unload/replace: 確認站位掃錯應顯示錯誤並不觸發 FEED', async ({ page }) => {
  const mockStats = [
    buildMockStat('NEW_MATERIAL_PACK'),
    {
      ...buildMockStat('NEW_MATERIAL_PACK'),
      id: 2,
      sub_slot_idno: 'R',
      feed_records: [
        {
          id: 2000,
          feed_record_id: 2000,
          operation_time: '2024-01-01T00:00:00Z',
          operation_type: 'FEED',
          material_pack_code: 'PACK-R',
          feed_material_pack_type: 'NEW_MATERIAL_PACK',
          check_pack_code_match: 'MATCHED_MATERIAL_PACK',
        },
      ],
    },
  ]

  await page.route(`**/api/smt/panasonic_mounter_item/stats/${PRODUCTION_UUID}`, (route) =>
    route.fulfill({ json: mockStats })
  )
  await page.route(`**/api/smt/panasonic_mounter_item/stats/logs/${PRODUCTION_UUID}`, (route) =>
    route.fulfill({ json: [] })
  )
  await mockMaterialInventory(page, REPLACEMENT_PACK)

  const feedRequests: any[] = []
  await page.route('**/api/smt/panasonic_mounter_item/stat/roll', async (route) => {
    const request = route.request()
    if (request.method() !== 'POST') return route.continue()
    const body = request.postDataJSON()
    if (body?.operation_type === 'FEED') feedRequests.push(body)
    return route.fulfill({ json: {} })
  })

  const po = new ProductionPage(page, 'panasonic')
  await po.goto(PRODUCTION_UUID)

  await po.enterUnloadMode()
  await po.unloadMaterialInput.fill(INITIAL_PACK)
  await po.unloadMaterialInput.press('Enter')

  await po.unloadMaterialInput.fill(REPLACEMENT_PACK)
  await po.unloadMaterialInput.press('Enter')
  await expect(po.unloadSlotInput).toBeFocused({ timeout: 5000 })

  await po.unloadSlotInput.fill('10008-R')
  await po.unloadSlotInput.press('Enter')

  await expectLatestMessage(page, 'error-message', /請掃描原卸料站位/)
  expect(feedRequests.length).toBe(0)
})
