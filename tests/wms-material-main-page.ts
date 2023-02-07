import { expect, Locator, Page } from '@playwright/test'


export class WmsMaterialMainPage {
    page: Page

    constructor ( page: Page ) {
        this.page = page
    }

    async createProduct () { await this.page.getByRole( 'button', { name: '建立成品 ❶' } ).click() }
    async createInProcessMaterial () { await this.page.getByRole( 'button', { name: '建立半成品 ❷' } ).click() }
    async createRawMaterial () { await this.page.getByRole( 'button', { name: '建立原料 ❹' } ).click() }
    async batchCreate () { await this.page.getByRole( 'button', { name: '批次建立物料' } ).click() }
}
