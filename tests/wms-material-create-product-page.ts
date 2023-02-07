import { expect, Locator, Page } from '@playwright/test'
import { MaterialCreate, ProductCreate } from '../src/client/index'

export class WmsMaterialCreatProductPage {
    page: Page
    materialOfProduct: ProductCreate

    constructor ( page: Page, materialOfProduct: ProductCreate ) {
        this.page = page
        this.materialOfProduct = materialOfProduct
    }

    async fillForm () {
        await this.page.locator( '#idno' ).fill( this.materialOfProduct.idno )
        await this.page.locator( '#name' ).fill( this.materialOfProduct.name )
        await this.page.locator( '#description' ).fill( this.materialOfProduct.description )

        await this.page.locator( '.n-base-selection' ).click()
        await this.page.locator( '.n-base-select-option', { hasText: this.materialOfProduct.unit } ).click()

        await this.page.locator( '#qty_per_pack input' ).fill( this.materialOfProduct.qty_per_pack.toString() )
        await this.page.locator( '#expiry_days input' ).fill( this.materialOfProduct.expiry_days.toString() )
    }

    async submit () { await this.page.getByRole( 'button', { name: '建立成品' } ).click() }
}
