import { expect, Locator, Page } from '@playwright/test'


export class WmsIssuanceMainPage {
    page: Page

    constructor ( page: Page ) {
        this.page = page
    }

    async createIssuance () { await this.page.getByRole( 'button', { name: '建立發料單' } ).click() }
}
