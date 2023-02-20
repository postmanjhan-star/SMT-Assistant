import { expect, test } from '@playwright/test'
import { StartPage } from './start-page'
import { WmsHomePage } from './wms-home-page'
import { WmsLoginPage } from './wms-login-page'
import { WmsStErpWorkOrderMainPage } from './wms-sterp-work-order-main-page'

test.describe( 'WMS:STERP:WorkOrder', () => {
  test( 'Open work order pages', async ( { page } ) => {
    const startPage = new StartPage( page )
    await startPage.goto()
    await startPage.clickWmsApp()

    const wmsLoginPage = new WmsLoginPage( page )
    await wmsLoginPage.login()

    const wmsHomePage = new WmsHomePage( page )
    await wmsHomePage.goToStErpWorkOrders()

    const wmsStErpWorkOrderMainPage = new WmsStErpWorkOrderMainPage( page )
    await wmsStErpWorkOrderMainPage.queryByDate( new Date( 2023, 1, 17 ) ) // 2023-02-17

    const rowsDiv = page.locator( '.ag-center-cols-container > div' )
    const row = rowsDiv.filter( { hasText: 'HP1818' } )
    expect( row ).toBeTruthy()

    await row.dispatchEvent( 'dblclick' )

    await page.waitForTimeout( 1000 ) // Force wait!!!
    expect( await page.locator( 'input#productIdno' ).inputValue() ).toBe( '60X85-010A-M0' )
    expect( await page.locator( 'input#issueDate' ).inputValue() ).toBe( '2023-02-17' )
    expect( await page.locator( 'input#dueDate' ).inputValue() ).toBe( '2023-02-20' )
    expect( await page.locator( 'input#quantity' ).inputValue() ).toBe( '6' )
    expect( await page.locator( 'input#productionDepartment' ).inputValue() ).toBe( 'VF21' )
    expect( await page.locator( 'input#productionLine' ).inputValue() ).toBe( 'VF21' )
  } )
} )
