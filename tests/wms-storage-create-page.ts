import { expect, Locator, Page } from '@playwright/test'

import { StorageCreate } from '../src/client/index'


export class WmsStorageCreatPage {
    page: Page
    storageCreate: StorageCreate

    constructor ( page: Page, storageCreate: StorageCreate ) {
        this.page = page
        this.storageCreate = storageCreate
    }

    async fillL1StorageFields () {
        await this.page.locator( '#l1-storage-idno' ).fill( this.storageCreate.idno )
        await this.page.locator( '#l1-storage-name' ).fill( this.storageCreate.name )
    }

    async fillL2StorageFields () {
        await this.page.getByPlaceholder( '儲位代碼' ).fill( this.storageCreate.l2_storages[ 0 ].idno )
        await this.page.getByPlaceholder( '儲位名稱' ).fill( this.storageCreate.l2_storages[ 0 ].name )
    }

    async createStorage () { await this.page.getByRole( 'button', { name: '建立倉位' } ).click() }
}
