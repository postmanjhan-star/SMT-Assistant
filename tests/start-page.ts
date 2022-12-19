import { expect, Locator, Page } from '@playwright/test';


export class StartPage {
    page: Page;

    constructor ( page: Page ) { this.page = page; }

    async goto () { await this.page.goto( '/' ); }
    async clickWmsApp () { await this.page.getByText( 'WMS' ).click() }
}
