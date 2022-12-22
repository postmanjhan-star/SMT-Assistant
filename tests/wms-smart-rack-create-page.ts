import { expect, Locator, Page } from '@playwright/test'

import { SeastoneSmartRackCreate } from '../src/client/index'


export class WmsSmartRackCreatPage {
    page: Page
    smartRackCreate: SeastoneSmartRackCreate
    storageL1Idno: string

    constructor ( page: Page, smartRackCreate: SeastoneSmartRackCreate, storageL1Idno: string ) {
        this.page = page
        this.smartRackCreate = smartRackCreate
        this.storageL1Idno = storageL1Idno
    }

    async fillForm () {
        const select = this.page.locator( '.n-base-selection-input' )
        await select.fill( this.storageL1Idno )
        await select.press( 'Enter' )

        await this.page.locator( '#server_address' ).fill( this.smartRackCreate.server_address )
        await this.page.locator( '#rack_idno' ).fill( this.smartRackCreate.rack_idno )
        await this.page.locator( '#wifi_ip' ).fill( this.smartRackCreate.wifi_ip )
        await this.page.locator( '#wifi_mac' ).fill( this.smartRackCreate.wifi_mac )
        await this.page.locator( '#eth_ip' ).fill( this.smartRackCreate.eth_ip )
        await this.page.locator( '#eth_mac' ).fill( this.smartRackCreate.eth_mac )
        await this.page.locator( '#dev_id' ).fill( this.smartRackCreate.dev_id )
    }

    async submit () { await this.page.getByRole( 'button', { name: '送出' } ).click() }
}
