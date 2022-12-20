import { test, expect } from '@playwright/test'
import { StartPage } from './start-page'

// test.use({ viewport: { width: 500, height: 500 } });

test.describe( 'SMT:Panasonic', () => {
  test( 'Go to Panasonic Mounter Assistant', async ( { page } ) => {
    const startPage = new StartPage( page )
    await startPage.goto()
    await startPage.clickPanasonicMounterAssistant()

    // Enable testing mode
    await page.waitForSelector( '#workOrderIdnoInput' )
    const url = new URL( page.url() )
    url.searchParams.append( 'testing_mode', '1' )
    url.searchParams.append( 'testing_product_idno', '40X76-002A-T3' )
    await page.goto( url.toString() ) // http://127.0.0.1/smt/panasonic-mounter?testing_mode=1&testing_product_idno=40X76-002A-T3
    await page.locator( '#workOrderIdnoInput' ).fill( 'ZZ9999' )
    await page.locator( '#mounterIdnoInput' ).fill( 'A1-NPM-W2' )
    await page.getByText( '工件正反面' ).click()
    await page.getByText( '機台前面' ).click()
    await page.getByRole( 'button', { name: '確定' } ).click()

    await page.locator( '#materialInventoryIdnoInput' ).fill( 'A3573382' )
    await page.locator( '#materialInventoryIdnoInput' ).press( 'Enter' )
    await page.locator( '#slotIdnoInput' ).fill( '10001-L' )
    await page.locator( '#slotIdnoInput' ).press( 'Enter' )

    // await expect( component ).toContainText( 'Vite + Vue' )
  } );
} )
