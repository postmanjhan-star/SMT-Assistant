import { Page } from '@playwright/test'
import { format } from 'date-fns'


export class WmsStErpWorkOrderMainPage {
    page: Page

    constructor ( page: Page ) { this.page = page }

    async queryByDate ( date: Date ) {
        const dateString = format( date, 'yyyy-MM-dd' )
        await this.page.locator( 'input[placeholder="選擇日期"]' ).fill( dateString )
        await this.page.getByRole( 'button', { name: '查詢' } ).click()
    }
}
