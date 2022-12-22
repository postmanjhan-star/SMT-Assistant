import { expect, Locator, Page } from '@playwright/test'


export class WmsSmartRackMainPage {
    page: Page

    constructor ( page: Page ) {
        this.page = page
    }

    async createSmartRack () { await this.page.getByRole( 'button', { name: '建立料架' } ).click() }
}
