import { test, expect } from '@playwright/test'
import { SmtFujiMainPage } from './smt-fuji-main-page.js'

// test.use({ viewport: { width: 500, height: 500 } });

test.describe( 'SMT:Fuji', () => {
  test( 'Go to Fuji Mounter Assistant', async ( { page } ) => {
    const workOrder = 'ZZ9999'
    const productIdno = '40Y85-009B-T3VST'
    const mounterIdno = 'XP2B1'

    const smtFujiMainPage = new SmtFujiMainPage( page )
    await smtFujiMainPage.goto()
    await smtFujiMainPage.enableTestingMode( productIdno )
    await smtFujiMainPage.fillForm( workOrder, productIdno, mounterIdno )
    await smtFujiMainPage.submitForm()

    // await page.locator( '#materialInventoryIdnoInput' ).fill( 'A3573382' )
    // await page.locator( '#materialInventoryIdnoInput' ).press( 'Enter' )
    // await page.locator( '#slotIdnoInput' ).fill( '10001-L' )
    // await page.locator( '#slotIdnoInput' ).press( 'Enter' )

    // await expect( component ).toContainText( 'Vite + Vue' )
  } );
} )
