import {
  resolvePanasonicDetailRoute,
  resolvePanasonicProductionRoute,
} from "@/router/panasonicRouteGuards"
import { PANASONIC_NOT_FOUND_PATH } from "@/ui/shared/composables/panasonic/usePanasonicConstants"

describe("panasonicRouteGuards", () => {
  describe("resolvePanasonicDetailRoute", () => {
    it("returns 404 when required query is missing", () => {
      const result = resolvePanasonicDetailRoute({
        params: { mounterIdno: "A1", workOrderIdno: "WO1" },
        query: { machine_side: "1", work_sheet_side: "TOP" },
      })

      expect(result).toBe(PANASONIC_NOT_FOUND_PATH)
    })

    it("returns 404 for invalid machine_side", () => {
      const result = resolvePanasonicDetailRoute({
        params: { mounterIdno: "A1", workOrderIdno: "WO1" },
        query: {
          product_idno: "P1",
          machine_side: "3",
          work_sheet_side: "TOP",
        },
      })

      expect(result).toBe(PANASONIC_NOT_FOUND_PATH)
    })

    it("normalizes params and query", () => {
      const result = resolvePanasonicDetailRoute({
        params: { mounterIdno: " A1 ", workOrderIdno: " WO1 " },
        query: {
          product_idno: " P1 ",
          machine_side: " 1 ",
          work_sheet_side: " TOP ",
          testing_mode: " 1 ",
          testing_product_idno: " T-01 ",
        },
      })

      expect(result).toMatchObject({
        path: "/smt/panasonic-mounter/A1/WO1",
        replace: true,
      })
      expect((result as { query: Record<string, unknown> }).query).toMatchObject({
        product_idno: "P1",
        machine_side: "1",
        work_sheet_side: "TOP",
        testing_mode: "1",
        testing_product_idno: "T-01",
      })
    })

    it("returns true when already normalized", () => {
      const result = resolvePanasonicDetailRoute({
        params: { mounterIdno: "A1", workOrderIdno: "WO1" },
        query: {
          product_idno: "P1",
          machine_side: "1+2",
          work_sheet_side: "DUPLEX",
        },
      })

      expect(result).toBe(true)
    })
  })

  describe("resolvePanasonicProductionRoute", () => {
    it("returns 404 when productionUuid is missing", () => {
      const result = resolvePanasonicProductionRoute({
        params: { productionUuid: "" },
        query: {},
      })

      expect(result).toBe(PANASONIC_NOT_FOUND_PATH)
    })

    it("returns 404 for invalid testing_mode", () => {
      const result = resolvePanasonicProductionRoute({
        params: { productionUuid: "abc" },
        query: { testing_mode: "2" },
      })

      expect(result).toBe(PANASONIC_NOT_FOUND_PATH)
    })

    it("normalizes production route", () => {
      const result = resolvePanasonicProductionRoute({
        params: { productionUuid: " abc " },
        query: {
          product_idno: " P1 ",
          machine_side: " 1 ",
          work_sheet_side: " TOP ",
        },
      })

      expect(result).toMatchObject({
        path: "/smt/panasonic-mounter-production/abc",
        replace: true,
      })
      expect((result as { query: Record<string, unknown> }).query).toMatchObject({
        product_idno: "P1",
        machine_side: "1",
        work_sheet_side: "TOP",
      })
    })

    it("returns true for already normalized production route", () => {
      const result = resolvePanasonicProductionRoute({
        params: { productionUuid: "abc" },
        query: { testing_mode: "1", testing_product_idno: "TP1" },
      })

      expect(result).toBe(true)
    })
  })
})
