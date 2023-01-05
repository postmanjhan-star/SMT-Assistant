import { expect, Locator, Page } from '@playwright/test'

export class WmsIssuanceCreatPage {
    page: Page
    memo: string
    materialIdno: string
    inventoryIssueQty: number

    constructor ( page: Page, memo: string, materialIdno: string, inventoryIssueQty: number ) {
        this.page = page
        this.memo = memo
        this.materialIdno = materialIdno
        this.inventoryIssueQty = inventoryIssueQty
    }

    async fillMemo () {
        await this.page.waitForTimeout(1200) // Force wait!!!
        const memo = this.page.locator( '#memo' )
        await memo.fill( this.memo )
    }

    async addIssuanceItem () {
        const materialIdno = this.page.locator( '#material_idno' )
        await materialIdno.fill( this.materialIdno )
        await materialIdno.blur()
        await this.page.locator( '#quantity input' ).fill( this.inventoryIssueQty.toString() )
        await this.page.locator( '#add_by_material' ).click()
    }

    async submit () { await this.page.getByRole( 'button', { name: '建立發料單' } ).click() }
}
