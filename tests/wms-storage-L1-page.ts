import { expect, Locator, Page } from '@playwright/test'


export class WmsStorageL1Page {
    page: Page
    storageL2AgGridRowContainer: Locator

    constructor ( page: Page ) {
        this.page = page
        this.storageL2AgGridRowContainer = page.locator( '.ag-center-cols-viewport' )
    }

    async goToL2StorageTab () { await this.page.getByText( '儲位管理' ).click() }

    async goToWmsStorageMainPage () { await this.page.getByRole( 'link', { name: '倉位管理' } ).click() }
    
    async selectGridRow ( text: string ) { await this.page.getByText( text ).first().click() }
    
    async clickBatchMoveButton () { await this.page.getByRole( 'button', { name: '批次搬移' } ).click() }
    
    async selectMoveToStorageL1Idno ( toMoveStorageL1Idno: string ) {
        const select = this.page.locator( '.n-base-selection-input' )
        await select.fill( toMoveStorageL1Idno )
        await select.press( 'Enter' )
    }
    
    async submitBatchMoveDialog () { await this.page.getByRole( 'button', { name: '確認' } ).click() }
}
