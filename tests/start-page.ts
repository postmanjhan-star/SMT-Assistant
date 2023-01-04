import { expect, Locator, Page } from '@playwright/test'


export class StartPage {
    page: Page;

    constructor ( page: Page ) { this.page = page; }

    async goto () { await this.page.goto( '/' ) }
    async clickWmsApp () { await this.page.getByText( 'WMS' ).click() }
    async clickPanasonicMounterAssistant () { await this.page.getByRole( 'link', { name: '松下打件機\n上料助手' } ).click() }
    async clickFujiMounterAssistant () { await this.page.getByRole( 'link', { name: '富士打件機\n上料助手' } ).click() }
}
