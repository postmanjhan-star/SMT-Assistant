import { expect, Locator, Page } from '@playwright/test'


export class WmsStorageMainPage {
    page: Page
    storageDataTableBody: Locator

    constructor ( page: Page ) {
        this.page = page
        this.storageDataTableBody = page.locator( 'tbody' )
    }

    async createL1Storage () { await this.page.getByRole( 'button', { name: '建立倉位' } ).click() }
    async goToL1Storage ( goToL1Idno: string ) { await this.storageDataTableBody.getByText( goToL1Idno ).first().dblclick() }
}
