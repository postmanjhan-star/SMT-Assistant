import { test, expect } from '@playwright/test'
import { SmtFujiMainPage } from './smt-fuji-main-page'
import { StartPage } from './start-page'

// test.use({ viewport: { width: 500, height: 500 } });

test.describe( 'SMT:Fuji', () => {
  test( 'Go to Fuji Mounter Assistant', async ( { page } ) => {
    const testingProductIdno = '40Y85-009B-T3VST'

    const startPage = new StartPage( page )
    await startPage.goto()
    await startPage.clickFujiMounterAssistant()

    const smtFujiMainPage = new SmtFujiMainPage( page )
    await smtFujiMainPage.enableTestingMode( testingProductIdno )
    await smtFujiMainPage.fillForm()
    await smtFujiMainPage.submitForm()

    // await page.locator( '#materialInventoryIdnoInput' ).fill( 'A3573382' )
    // await page.locator( '#materialInventoryIdnoInput' ).press( 'Enter' )
    // await page.locator( '#slotIdnoInput' ).fill( '10001-L' )
    // await page.locator( '#slotIdnoInput' ).press( 'Enter' )

    // await expect( component ).toContainText( 'Vite + Vue' )
  } );
} )
