import { expect, test } from '@playwright/test'
import { SmtPanasonicMainPage } from './smt-panasonic-main-page'
import { SmtPanasonicUploadPage } from './smt-panasonic-upload-page'
import { StartPage } from './start-page'

// test.use({ viewport: { width: 500, height: 500 } });

test.describe( 'SMT:Panasonic', () => {
  test( 'Upload CSV file', async ( { page } ) => {
    const csvFilePath = './tests/40Y85-010A-B-T 料站.csv'
    const ProductVer = 'X0'

    const startPage = new StartPage( page )
    await startPage.goto()
    await startPage.clickPanasonicMounterAssistant()

    const smtPanasonicMainPage = new SmtPanasonicMainPage( page )
    await smtPanasonicMainPage.goToUploadPage()

    const smtPanasonicUploadPage = new SmtPanasonicUploadPage( page, csvFilePath, ProductVer )
    await smtPanasonicUploadPage.openFile()
    await smtPanasonicUploadPage.fillProductVer()
    await smtPanasonicUploadPage.submit()

    await expect( page.locator( '.n-message__content' ) ).toContainText( '上傳成功' )
  } )


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
  } )
} )
