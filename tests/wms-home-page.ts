import { expect, Locator, Page } from '@playwright/test'


export class WmsHomePage {
    page: Page;

    constructor ( page: Page ) { this.page = page; }

    async goToStorages () {
        await this.page.getByRole( 'link', { name: '倉位管理' } ).click()
    }
}
