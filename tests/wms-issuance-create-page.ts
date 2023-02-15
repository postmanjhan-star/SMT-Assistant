import { expect, Locator, Page } from '@playwright/test'

export class WmsIssuanceCreatePage {
    page: Page

    constructor ( page: Page ) { this.page = page }

    async fillMemo ( memo: string ) {
        const memoInput = this.page.locator( '#memo' )
        await memoInput.fill( memo )
    }

    async addIssuanceItemByMaterialIdno ( materialIdno: string, inventoryIssueQty: number ) {
        const materialIdnoInput = this.page.locator( '#material_idno' )
        await materialIdnoInput.fill( materialIdno )
        await materialIdnoInput.blur()
        await this.page.locator( '#quantity input' ).fill( inventoryIssueQty.toString() )
        await this.page.locator( '#add_by_material' ).click()
    }

    async addIssuanceItemByInventoryIdno ( inventoryIdno: string ) {
        const agGridPinnedRow = this.page.locator( '.ag-floating-top' )
        const agGridInventoryCell = agGridPinnedRow.locator( '[col-id="materialInventoryIdno"]' )
        await agGridInventoryCell.dispatchEvent( 'dblclick' )
        await agGridInventoryCell.locator( 'input' ).fill( inventoryIdno )
        await agGridInventoryCell.locator( 'input' ).press( 'Enter' )
    }

    async submit () { await this.page.getByRole( 'button', { name: '建立發料單' } ).click() }
}
