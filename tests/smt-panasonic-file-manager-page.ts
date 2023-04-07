import { expect, Locator, Page } from '@playwright/test'


export class SmtPanasonicFileManagerPage {
    page: Page

    constructor ( page: Page ) {
        this.page = page
    }

    async goto () { await this.page.goto( '/smt/panasonic-mounter/manager' ) }
    async goToUploadPage () { await this.page.getByRole( 'button', { name: '上傳 CSV 檔案' } ).click() }
}
