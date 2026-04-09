import { Page, expect } from '@playwright/test'
import { expectLatestMessage, type ScanRecord } from '../helpers/scan'

export type Machine = 'fuji' | 'panasonic'

export const MACHINE_URLS = {
    fuji: {
        normal: 'http://localhost/smt/fuji-mounter/XP2B1/ZZ9999?product_idno=40X85-009B-TEST_SCAN&work_sheet_side=TOP',
        testing: 'http://localhost/smt/fuji-mounter/XP2B1/ZZ9999?product_idno=40X85-009B-TEST_SCAN&work_sheet_side=TOP&testing_mode=1&testing_product_idno=40X85-009B-TEST_SCAN',
        productionPattern: /\/smt\/fuji-mounter-production\/.+/,
    },
    panasonic: {
        normal: 'http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3',
        testing: 'http://localhost/smt/panasonic-mounter/A1-NPM-W2/ZZ9999?work_sheet_side=DUPLEX&machine_side=1%2B2&product_idno=40Y85-010A-M3&testing_mode=1&testing_product_idno=40Y85-010A-M3',
        productionPattern: /\/smt\/panasonic-mounter-production\/.+/,
    },
}

export class DetailPage {
    constructor(private page: Page, private machine: Machine) {}

    // --- URL helpers ---
    get normalUrl() { return MACHINE_URLS[this.machine].normal }
    get testingUrl() { return MACHINE_URLS[this.machine].testing }
    get productionUrlPattern() { return MACHINE_URLS[this.machine].productionPattern }

    get csvDataPath() {
        return this.machine === 'fuji'
            ? 'tests/e2e/data/fuji_mounter_feed_records.csv'
            : 'tests/e2e/data/panasonic_mounter_feed_records.csv'
    }

    // --- API route patterns ---
    statsApiRoute(uuid: string) {
        return this.machine === 'fuji'
            ? `**/smt/fuji_mounter_item/stats/${uuid}`
            : `**/smt/panasonic_mounter_item/stats/${uuid}`
    }

    statsLogsApiRoute(uuid: string) {
        return this.machine === 'fuji'
            ? `**/smt/fuji_mounter_item/stats/logs/${uuid}`
            : `**/smt/panasonic_mounter_item/stats/logs/${uuid}`
    }

    get rollApiRoute() {
        return this.machine === 'fuji'
            ? '**/smt/fuji_mounter_item/stat/roll'
            : '**/smt/panasonic_mounter_item/stat/roll'
    }

    get statsPostApiRoute() {
        return this.machine === 'fuji'
            ? '**/smt/fuji_mounter_item/stats'
            : '**/smt/panasonic_mounter_item/stats'
    }

    // --- Selectors ---
    get materialInput() {
        return this.machine === 'fuji'
            ? this.page.locator('.n-input input').first()
            : this.page.getByTestId('panasonic-main-material-input').locator('input')
    }

    get slotInput() {
        return this.machine === 'fuji'
            ? this.page.locator('*:focus')
            : this.page.getByTestId('panasonic-main-slot-input').locator('input')
    }

    get ipqcMaterialInput() {
        const id = this.machine === 'fuji' ? 'fuji-ipqc-material-input' : 'prod-ipqc-material-input'
        return this.page.locator(`#${id}`)
    }

    get ipqcSlotInput() {
        const id = this.machine === 'fuji' ? 'fuji-ipqc-slot-input' : 'prod-ipqc-slot-input'
        return this.page.locator(`#${id}`)
    }

    row(rowId: string) {
        return this.page.locator(`[row-id="${rowId}"]`)
    }

    // --- Scan actions ---
    private async waitForSlotFocus() {
        if (this.machine === 'panasonic') {
            await expect(this.slotInput).toBeFocused({ timeout: 10000 })
            return
        }
        // Fuji: wait until any different INPUT element gains focus
        const materialHandle = await this.materialInput.elementHandle()
        await this.page.waitForFunction(
            (matInputEl) => {
                const active = document.activeElement as HTMLInputElement | null
                return !!active && active.tagName === 'INPUT' && active !== matInputEl
            },
            materialHandle,
            { timeout: 10000 }
        )
    }

    async scanOne(material: string, slot: string) {
        const materialInput = this.materialInput
        await expect(materialInput).toBeVisible()
        await materialInput.click()
        await materialInput.fill(material)
        if (this.machine === 'fuji') await this.page.waitForTimeout(300)
        await materialInput.press('Enter')
        await this.waitForSlotFocus()
        await this.slotInput.fill(slot)
        await this.slotInput.press('Enter')
    }

    async scanAll(records: ScanRecord[]) {
        for (const [index, record] of records.entries()) {
            console.log(`scan ${index + 1}/${records.length}: ${record.material}`)
            try {
                await this.scanOne(record.material, record.slot)
            } catch {
                console.log(`skip record due to timeout/error: ${record.material}`)
            }
        }
    }

    async scanAllIpqc(records: ScanRecord[]) {
        const materialInput = this.ipqcMaterialInput
        const slotInput = this.ipqcSlotInput
        for (const [index, record] of records.entries()) {
            console.log(`IPQC scan ${index + 1}/${records.length}: ${record.material}`)
            try {
                await expect(materialInput).toBeVisible()
                await materialInput.click()
                await materialInput.fill(record.material)
                await materialInput.press('Enter')
                if (index === 0) await expectLatestMessage(this.page, 'success-message', /物料已確認/)
                await expect(slotInput).toBeEnabled({ timeout: 10000 })
                await slotInput.fill(record.slot)
                await slotInput.press('Enter')
                if (index === 0) await expectLatestMessage(this.page, 'success-message', /巡檢成功/)
            } catch {
                console.log(`skip IPQC record due to timeout/error: ${record.material}`)
            }
        }
    }

    async expectMainScanInputsCleared() {
        await expect(this.materialInput).toHaveValue('')
        if (this.machine === 'panasonic') {
            await expect(this.page.getByTestId('panasonic-main-slot-input').locator('input')).toHaveValue('')
        }
    }
}
