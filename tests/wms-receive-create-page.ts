import { expect, Locator, Page } from '@playwright/test'

export class WmsReceiveCreatPage {
    page: Page

    constructor ( page: Page ) { this.page = page }

    async fillVendor ( vendorIdno: string ) {
        const vendorIdnoInput = this.page.locator( '#vendor-idno-input')
        await vendorIdnoInput.fill( vendorIdno )
        await vendorIdnoInput.press( 'Enter' )
    }

    async addReceiveMaterial ( materialIdno: string, receiveQuantity: number ) {
        await this.page.locator( '#material_idno' ).fill( materialIdno )
        await this.page.locator( '#total_qty input' ).fill( receiveQuantity.toString() )
        await this.page.locator( '#qualify_qty input' ).fill( receiveQuantity.toString() )
        await this.page.getByRole( 'button', { name: '增加物料' } ).click()
    }

    async submit () { await this.page.getByRole( 'button', { name: '建立收料單' } ).click() }
}
