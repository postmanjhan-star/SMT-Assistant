export type FeedScenario = {
  machine: 'fuji' | 'panasonic'
  productionUuid: string
  materialPackCode: string
  slotIdno: string
  expectedRowId: string
  mode: 'normal' | 'testing'
  mockStats: object[]
  mockMaterial: object
}

const FUJI_MOCK_MATERIAL = {
  idno: 'VNT-TEST-0001',
  material_id: null,
  material_idno: 'MAT-FUJI-001',
  material_name: 'Test Fuji Material',
}

// material_idno must match FUJI_MOCK_MATERIAL.material_idno so getMaterialMatchedRows returns this row
const FUJI_MOCK_STAT_NORMAL = {
  id: 1,
  uuid: 'fake-fuji-uuid-0001',
  created_at: '2024-01-01T00:00:00Z',
  production_start: '2024-01-01T00:00:00Z',
  production_end: null,
  work_order_no: null,
  product_idno: 'TEST-PRODUCT',
  machine_idno: 'XP2B1',
  machine_side: null,
  board_side: null,
  slot_idno: '25',
  sub_slot_idno: 'A',
  material_idno: 'MAT-FUJI-001',
  produce_mode: null,
}

const FUJI_MOCK_STAT_TESTING = {
  ...FUJI_MOCK_STAT_NORMAL,
  produce_mode: 'TESTING_PRODUCE_MODE',
}

const PANASONIC_MOCK_MATERIAL = {
  idno: 'PAN-TEST-0001',
  material_id: null,
  material_idno: 'MAT-PAN-001',
  material_name: 'Test Panasonic Material',
}

// slot_idno / sub_slot_idno match what usePanasonicProductionWorkflow reads from the stat
const PANASONIC_MOCK_STAT_NORMAL = {
  id: 1,
  uuid: 'fake-panasonic-uuid-0001',
  created_at: '2024-01-01T00:00:00Z',
  production_start: '2024-01-01T00:00:00Z',
  production_end: null,
  work_order_no: null,
  product_idno: 'TEST-PRODUCT',
  machine_idno: 'TEST-PAN',
  machine_side: null,
  board_side: null,
  slot_idno: '001',
  sub_slot_idno: null,
  material_idno: 'MAT-PAN-001',
  produce_mode: null,
  feed_records: [],
}

const PANASONIC_MOCK_STAT_TESTING = {
  ...PANASONIC_MOCK_STAT_NORMAL,
  produce_mode: 'TESTING_PRODUCE_MODE',
}

export const FEED_SCENARIOS: FeedScenario[] = [
  {
    machine: 'fuji',
    productionUuid: 'fake-fuji-uuid-0001',
    materialPackCode: 'VNT-TEST-0001',
    slotIdno: 'XP2B1-A-25',
    expectedRowId: '25-A',
    mode: 'normal',
    mockStats: [FUJI_MOCK_STAT_NORMAL],
    mockMaterial: FUJI_MOCK_MATERIAL,
  },
  {
    machine: 'fuji',
    productionUuid: 'fake-fuji-uuid-0001',
    materialPackCode: 'VNT-TEST-0001',
    slotIdno: 'XP2B1-A-25',
    expectedRowId: '25-A',
    mode: 'testing',
    mockStats: [FUJI_MOCK_STAT_TESTING],
    mockMaterial: FUJI_MOCK_MATERIAL,
  },
  {
    machine: 'panasonic',
    productionUuid: 'fake-panasonic-uuid-0001',
    materialPackCode: 'PAN-TEST-0001',
    slotIdno: '001',
    expectedRowId: '001-',
    mode: 'normal',
    mockStats: [PANASONIC_MOCK_STAT_NORMAL],
    mockMaterial: PANASONIC_MOCK_MATERIAL,
  },
  {
    machine: 'panasonic',
    productionUuid: 'fake-panasonic-uuid-0001',
    materialPackCode: 'PAN-TEST-0001',
    slotIdno: '001',
    expectedRowId: '001-',
    mode: 'testing',
    mockStats: [PANASONIC_MOCK_STAT_TESTING],
    mockMaterial: PANASONIC_MOCK_MATERIAL,
  },
]
