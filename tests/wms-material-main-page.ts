import { expect, Locator, Page } from '@playwright/test'


export class WmsMaterialMainPage {
    page: Page

    constructor ( page: Page ) {
        this.page = page
    }

    async batchCreate () { await this.page.getByRole( 'button', { name: '批次建立物料' } ).click() }
}
