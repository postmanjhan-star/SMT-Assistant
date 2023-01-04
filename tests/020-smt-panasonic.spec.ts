import { test, expect } from '@playwright/test'
import { SmtPanasonicMainPage } from './smt-panasonic-main-page'
import { StartPage } from './start-page'

// test.use({ viewport: { width: 500, height: 500 } });

test.describe( 'SMT:Panasonic', () => {
  test( 'Go to Panasonic Mounter Assistant', async ( { page } ) => {
    const testingProductIdno = '40X76-002A-T3'

    const startPage = new StartPage( page )
    await startPage.goto()
    await startPage.clickPanasonicMounterAssistant()

    const smtPanasonicMainPage = new SmtPanasonicMainPage( page )
    await smtPanasonicMainPage.enableTestingMode( testingProductIdno )
    await smtPanasonicMainPage.fillForm()
    await smtPanasonicMainPage.submitForm()

    await page.locator( '#materialInventoryIdnoInput' ).fill( 'A3573382' )
    await page.locator( '#materialInventoryIdnoInput' ).press( 'Enter' )
    await page.locator( '#slotIdnoInput' ).fill( '10001-L' )
    await page.locator( '#slotIdnoInput' ).press( 'Enter' )

    // await expect( component ).toContainText( 'Vite + Vue' )
  } );
} )
