import { expect, Locator, Page } from '@playwright/test'


export class WmsReceiveMainPage {
    page: Page

    constructor ( page: Page ) {
        this.page = page
    }

    async createReceive () { await this.page.getByRole( 'button', { name: '建立收料單' } ).click() }
}
