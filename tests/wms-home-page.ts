import { expect, Locator, Page } from '@playwright/test'


export class WmsHomePage {
    page: Page;

    constructor ( page: Page ) { this.page = page; }

    async goToStorages () { await this.page.getByRole( 'link', { name: '倉位管理' } ).click() }

    async goToSmartRacks () { await this.page.getByRole( 'link', { name: '智慧料架管理' } ).click() }

    async goToMaterials () { await this.page.getByRole( 'link', { name: '物料管理' } ).click() }
}
