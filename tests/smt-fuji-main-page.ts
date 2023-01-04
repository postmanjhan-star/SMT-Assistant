import { expect, Locator, Page } from '@playwright/test'


export class SmtFujiMainPage {
    page: Page

    constructor ( page: Page ) {
        this.page = page
    }

    async enableTestingMode ( testingProductIdno: string ) {
        await this.page.waitForSelector( '#workOrderIdnoInput' )

        const url = new URL( this.page.url() )
        url.searchParams.append( 'testing_mode', '1' )
        url.searchParams.append( 'testing_product_idno', testingProductIdno )
        await this.page.goto( url.toString() ) // http://127.0.0.1/smt/fuji-mounter?testing_mode=1&testing_product_idno=40Y85-009B-T3VST
    }

    async fillForm () {
        await this.page.locator( '#workOrderIdnoInput' ).fill( 'ZZ9999' )
        await this.page.locator( '#mounterIdnoInput' ).fill( 'XP143' )
    }

    async submitForm () { await this.page.getByRole( 'button', { name: '確定' } ).click() }
}
