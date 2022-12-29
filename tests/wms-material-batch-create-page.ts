import { expect, Locator, Page } from '@playwright/test'



export class WmsMaterialBatchCreatPage {
    page: Page
    batchFilePath: string

    constructor ( page: Page, batchFilePath: string ) {
        this.page = page
        this.batchFilePath = batchFilePath
    }

    async goToMaterialMainPage () { await this.page.getByRole( 'link', { name: '物料管理' } ).click() }

    async openFile () {
        // Start waiting for file chooser before clicking. Note no await.
        const fileChooserPromise = this.page.waitForEvent( 'filechooser' )
        const uploadArea = this.page.locator( '.n-upload' )
        await uploadArea.click()
        const fileChooser = await fileChooserPromise
        await fileChooser.setFiles( this.batchFilePath )
    }

    async submit () { await this.page.getByRole( 'button', { name: '上傳' } ).click() }
}
