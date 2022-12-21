import { expect, Locator, Page } from '@playwright/test';


export class WmsLoginPage {
    page: Page;

    constructor ( page: Page ) { this.page = page; }

    async login () {
        await this.page.locator( '#username' ).fill( 'admin' )
        await this.page.locator( '#password' ).fill( 'adminpassword' )
        await this.page.locator( '#password' ).press( 'Enter' )
    }
}
