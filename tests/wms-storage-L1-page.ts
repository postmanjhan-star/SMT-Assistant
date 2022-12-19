import { expect, Locator, Page } from '@playwright/test'


export class WmsStorageL1Page {
    page: Page
    storageL2AgGridRowContainer: Locator

    constructor ( page: Page ) {
        this.page = page
        this.storageL2AgGridRowContainer = page.locator( '.ag-center-cols-viewport' )
    }

    async goToL2StorageTab () { await this.page.getByText( '儲位管理' ).click() }
}
