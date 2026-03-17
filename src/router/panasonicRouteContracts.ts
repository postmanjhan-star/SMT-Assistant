import type { LocationQueryRaw, RouteLocationRaw } from "vue-router"
import {
  PANASONIC_BOARD_SIDE_VALUES,
  PANASONIC_DETAIL_BASE_PATH,
  PANASONIC_MACHINE_SIDE_VALUES,
  PANASONIC_PRODUCTION_BASE_PATH,
  type PanasonicBoardSide,
  type PanasonicMachineSide,
} from "@/ui/shared/composables/panasonic/usePanasonicConstants"
import { normalizeRouteValue } from "@/ui/shared/route/normalizeRouteValue"

export type PanasonicDetailRouteContract = {
  mounterIdno: string
  workOrderIdno: string
  productIdno: string
  machineSide: PanasonicMachineSide
  workSheetSide: PanasonicBoardSide
  testingMode?: "1"
  testingProductIdno?: string
}

export type PanasonicProductionRouteContract = {
  productionUuid: string
  productIdno?: string
  machineSide?: PanasonicMachineSide
  workSheetSide?: PanasonicBoardSide
  testingMode?: "1"
  testingProductIdno?: string
}

function isRouteValueTrimmed(value: unknown): boolean {
  if (Array.isArray(value)) {
    if (value.length > 1) return false
    return isRouteValueTrimmed(value[0] ?? "")
  }

  const raw = String(value ?? "")
  return raw === raw.trim()
}

function toNormalizedQuery(query: Record<string, unknown>): Record<string, string> {
  const normalized: Record<string, string> = {}

  Object.entries(query).forEach(([key, value]) => {
    const text = normalizeRouteValue(value)
    if (text) {
      normalized[key] = text
    }
  })

  return normalized
}

function isMachineSide(value: string): value is PanasonicMachineSide {
  return (PANASONIC_MACHINE_SIDE_VALUES as readonly string[]).includes(value)
}

function isBoardSide(value: string): value is PanasonicBoardSide {
  return (PANASONIC_BOARD_SIDE_VALUES as readonly string[]).includes(value)
}

export function parsePanasonicDetailRoute(routeLike: {
  params: Record<string, unknown>
  query: Record<string, unknown>
}): { ok: true; value: PanasonicDetailRouteContract } | { ok: false } {
  const mounterIdno = normalizeRouteValue(routeLike.params.mounterIdno)
  const workOrderIdno = normalizeRouteValue(routeLike.params.workOrderIdno)
  const productIdno = normalizeRouteValue(routeLike.query.product_idno)
  const machineSideRaw = normalizeRouteValue(routeLike.query.machine_side)
  const workSheetSideRaw = normalizeRouteValue(routeLike.query.work_sheet_side)
  const testingModeRaw = normalizeRouteValue(routeLike.query.testing_mode)
  const testingProductIdno = normalizeRouteValue(routeLike.query.testing_product_idno)

  if (!mounterIdno || !workOrderIdno || !productIdno) {
    return { ok: false }
  }

  if (!isMachineSide(machineSideRaw) || !isBoardSide(workSheetSideRaw)) {
    return { ok: false }
  }

  if (testingModeRaw && testingModeRaw !== "1") {
    return { ok: false }
  }

  const value: PanasonicDetailRouteContract = {
    mounterIdno,
    workOrderIdno,
    productIdno,
    machineSide: machineSideRaw,
    workSheetSide: workSheetSideRaw,
  }

  if (testingModeRaw === "1") {
    value.testingMode = "1"
    if (testingProductIdno) {
      value.testingProductIdno = testingProductIdno
    }
  }

  return { ok: true, value }
}

export function parsePanasonicProductionRoute(routeLike: {
  params: Record<string, unknown>
  query: Record<string, unknown>
}): { ok: true; value: PanasonicProductionRouteContract } | { ok: false } {
  const productionUuid = normalizeRouteValue(routeLike.params.productionUuid)
  if (!productionUuid) {
    return { ok: false }
  }

  const machineSideRaw = normalizeRouteValue(routeLike.query.machine_side)
  const workSheetSideRaw = normalizeRouteValue(routeLike.query.work_sheet_side)
  const testingModeRaw = normalizeRouteValue(routeLike.query.testing_mode)
  const testingProductIdno = normalizeRouteValue(routeLike.query.testing_product_idno)
  const productIdno = normalizeRouteValue(routeLike.query.product_idno)

  if (machineSideRaw && !isMachineSide(machineSideRaw)) {
    return { ok: false }
  }

  if (workSheetSideRaw && !isBoardSide(workSheetSideRaw)) {
    return { ok: false }
  }

  if (testingModeRaw && testingModeRaw !== "1") {
    return { ok: false }
  }

  const value: PanasonicProductionRouteContract = {
    productionUuid,
  }

  if (productIdno) {
    value.productIdno = productIdno
  }

  if (machineSideRaw) {
    value.machineSide = machineSideRaw as PanasonicMachineSide
  }

  if (workSheetSideRaw) {
    value.workSheetSide = workSheetSideRaw as PanasonicBoardSide
  }

  if (testingModeRaw === "1") {
    value.testingMode = "1"
    if (testingProductIdno) {
      value.testingProductIdno = testingProductIdno
    }
  }

  return { ok: true, value }
}

export function isPanasonicDetailRouteNormalized(
  routeLike: {
    params: Record<string, unknown>
    query: Record<string, unknown>
  },
  contract: PanasonicDetailRouteContract
): boolean {
  if (!isRouteValueTrimmed(routeLike.params.mounterIdno)) {
    return false
  }

  if (normalizeRouteValue(routeLike.params.mounterIdno) !== contract.mounterIdno) {
    return false
  }

  if (!isRouteValueTrimmed(routeLike.params.workOrderIdno)) {
    return false
  }

  if (normalizeRouteValue(routeLike.params.workOrderIdno) !== contract.workOrderIdno) {
    return false
  }

  if (!isRouteValueTrimmed(routeLike.query.product_idno)) {
    return false
  }

  if (normalizeRouteValue(routeLike.query.product_idno) !== contract.productIdno) {
    return false
  }

  if (!isRouteValueTrimmed(routeLike.query.machine_side)) {
    return false
  }

  if (normalizeRouteValue(routeLike.query.machine_side) !== contract.machineSide) {
    return false
  }

  if (!isRouteValueTrimmed(routeLike.query.work_sheet_side)) {
    return false
  }

  if (normalizeRouteValue(routeLike.query.work_sheet_side) !== contract.workSheetSide) {
    return false
  }

  const testingModeRaw = normalizeRouteValue(routeLike.query.testing_mode)
  const testingProductIdnoRaw = normalizeRouteValue(routeLike.query.testing_product_idno)

  if (contract.testingMode === "1") {
    if (!isRouteValueTrimmed(routeLike.query.testing_mode)) {
      return false
    }

    if (testingModeRaw !== "1") {
      return false
    }

    if (!isRouteValueTrimmed(routeLike.query.testing_product_idno)) {
      return false
    }

    if (testingProductIdnoRaw !== (contract.testingProductIdno ?? "")) {
      return false
    }
  } else if (testingModeRaw || testingProductIdnoRaw) {
    return false
  }

  return true
}

export function isPanasonicProductionRouteNormalized(
  routeLike: {
    params: Record<string, unknown>
    query: Record<string, unknown>
  },
  contract: PanasonicProductionRouteContract
): boolean {
  if (!isRouteValueTrimmed(routeLike.params.productionUuid)) {
    return false
  }

  if (
    normalizeRouteValue(routeLike.params.productionUuid) !==
    contract.productionUuid
  ) {
    return false
  }

  if (!isRouteValueTrimmed(routeLike.query.product_idno)) {
    return false
  }

  if (normalizeRouteValue(routeLike.query.product_idno) !== (contract.productIdno ?? "")) {
    return false
  }

  if (!isRouteValueTrimmed(routeLike.query.machine_side)) {
    return false
  }

  if (normalizeRouteValue(routeLike.query.machine_side) !== (contract.machineSide ?? "")) {
    return false
  }

  if (!isRouteValueTrimmed(routeLike.query.work_sheet_side)) {
    return false
  }

  if (normalizeRouteValue(routeLike.query.work_sheet_side) !== (contract.workSheetSide ?? "")) {
    return false
  }

  const testingModeRaw = normalizeRouteValue(routeLike.query.testing_mode)
  const testingProductIdnoRaw = normalizeRouteValue(routeLike.query.testing_product_idno)

  if (contract.testingMode === "1") {
    if (!isRouteValueTrimmed(routeLike.query.testing_mode)) {
      return false
    }

    if (testingModeRaw !== "1") {
      return false
    }

    if (!isRouteValueTrimmed(routeLike.query.testing_product_idno)) {
      return false
    }

    if (testingProductIdnoRaw !== (contract.testingProductIdno ?? "")) {
      return false
    }
  } else if (testingModeRaw || testingProductIdnoRaw) {
    return false
  }

  return true
}

export function toPanasonicDetailRouteLocation(
  contract: PanasonicDetailRouteContract,
  currentQuery: Record<string, unknown> = {}
): RouteLocationRaw {
  const query = toNormalizedQuery(currentQuery)

  query.product_idno = contract.productIdno
  query.machine_side = contract.machineSide
  query.work_sheet_side = contract.workSheetSide

  if (contract.testingMode === "1") {
    query.testing_mode = "1"

    if (contract.testingProductIdno) {
      query.testing_product_idno = contract.testingProductIdno
    } else {
      delete query.testing_product_idno
    }
  } else {
    delete query.testing_mode
    delete query.testing_product_idno
  }

  return {
    path: `${PANASONIC_DETAIL_BASE_PATH}/${contract.mounterIdno}/${contract.workOrderIdno}`,
    query: query as LocationQueryRaw,
    replace: true,
  }
}

export function toPanasonicProductionRouteLocation(
  contract: PanasonicProductionRouteContract,
  currentQuery: Record<string, unknown> = {}
): RouteLocationRaw {
  const query = toNormalizedQuery(currentQuery)

  if (contract.productIdno) {
    query.product_idno = contract.productIdno
  } else {
    delete query.product_idno
  }

  if (contract.machineSide) {
    query.machine_side = contract.machineSide
  } else {
    delete query.machine_side
  }

  if (contract.workSheetSide) {
    query.work_sheet_side = contract.workSheetSide
  } else {
    delete query.work_sheet_side
  }

  if (contract.testingMode === "1") {
    query.testing_mode = "1"

    if (contract.testingProductIdno) {
      query.testing_product_idno = contract.testingProductIdno
    } else {
      delete query.testing_product_idno
    }
  } else {
    delete query.testing_mode
    delete query.testing_product_idno
  }

  return {
    path: `${PANASONIC_PRODUCTION_BASE_PATH}/${contract.productionUuid}`,
    query: query as LocationQueryRaw,
    replace: true,
  }
}
