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
    await wmsStErpWorkOrderMainPage.queryByDate( new Date( 2023, 2, 3 ) ) // 2023-03-03
    await page.waitForTimeout( 1000 ) // Force wait!!!

    const rowsDiv = page.locator( '.ag-center-cols-container > div' )
    const row = rowsDiv.filter( { hasText: 'HP3573' } )
    expect( row ).toBeTruthy()

    await row.dispatchEvent( 'dblclick' )

    await page.waitForTimeout( 1000 ) // Force wait!!!
    expect( await page.locator( 'input#productIdno' ).inputValue() ).toBe( '40878-001A-R0' )
    expect( await page.locator( 'input#issueDate' ).inputValue() ).toBe( '2023-03-03' )
    expect( await page.locator( 'input#dueDate' ).inputValue() ).toBe( '2023-03-06' )
    expect( await page.locator( 'input#quantity' ).inputValue() ).toBe( '40' )
    expect( await page.locator( 'input#productionDepartment' ).inputValue() ).toBe( 'VF11' )
    expect( await page.locator( 'input#productionLine' ).inputValue() ).toBe( 'VF11' )
  } )
} )
