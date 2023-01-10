import { expect, Locator, Page } from '@playwright/test'


export class SmtPanasonicUploadPage {
    page: Page
    csvFilePath: string
    productVer: string

    constructor ( page: Page, csvFilePath: string, productVer: string ) {
        this.page = page
        this.csvFilePath = csvFilePath
        this.productVer = productVer
    }

    async goToUploadPage () { await this.page.getByRole( 'link', { name: '上傳 CSV 檔案作業' } ).click() }

    async openFile () {
        // Start waiting for file chooser before clicking. Note no await.
        const fileChooserPromise = this.page.waitForEvent( 'filechooser' )
        const uploadArea = this.page.locator( '.n-upload' )
        await uploadArea.click()
        const fileChooser = await fileChooserPromise
        await fileChooser.setFiles( this.csvFilePath )
    }

    async fillProductVer () { await this.page.locator( '#product_ver' ).fill( this.productVer ) }

    async submit () { await this.page.getByRole( 'button', { name: '上傳' } ).click() }
}
