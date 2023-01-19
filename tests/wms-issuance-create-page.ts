import { expect, Locator, Page } from '@playwright/test'

export class WmsIssuanceCreatPage {
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
        const inventoryInput = this.page.locator( '#inventoryIdnoInput' )
        await inventoryInput.fill( inventoryIdno )
        await this.page.locator( '#addByInventory' ).click()
    }

    async submit () { await this.page.getByRole( 'button', { name: '建立發料單' } ).click() }
}
