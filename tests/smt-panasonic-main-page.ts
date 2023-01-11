import { expect, Locator, Page } from '@playwright/test'


export class SmtPanasonicMainPage {
    page: Page

    constructor ( page: Page ) {
        this.page = page
    }

    async goToUploadPage () { await this.page.getByRole( 'link', { name: '上傳 CSV 檔案作業' } ).click() }

    async enableTestingMode ( testingProductIdno: string ) {
        await this.page.waitForSelector( '#workOrderIdnoInput' )

        const url = new URL( this.page.url() )
        url.searchParams.append( 'testing_mode', '1' )
        url.searchParams.append( 'testing_product_idno', testingProductIdno )
        await this.page.goto( url.toString() ) // http://127.0.0.1/smt/panasonic-mounter?testing_mode=1&testing_product_idno=40X76-002A-T3
    }

    async fillForm ( workIdno: string, productIdno: string, mounterIdno: string ) {
        await this.page.locator( '#workOrderIdnoInput' ).fill( workIdno )
        await this.page.locator( '#productIdnoInput' ).fill( productIdno )
        await this.page.locator( '#mounterIdnoInput' ).fill( mounterIdno )
        await this.page.getByText( '工件正反面' ).click()
        await this.page.getByText( '機台前面' ).click()
    }

    async submitForm () { await this.page.getByRole( 'button', { name: '確定' } ).click() }
}
