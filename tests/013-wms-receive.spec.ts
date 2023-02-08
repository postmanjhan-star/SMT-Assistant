import { faker } from '@faker-js/faker/locale/zh_TW'
import { APIRequestContext, expect, test } from '@playwright/test'
import { sample } from 'lodash'
import { MaterialRead, VendorRead } from '../src/client/index'
import { StartPage } from './start-page'
import { WmsHomePage } from './wms-home-page'
import { WmsLoginPage } from './wms-login-page'
import { WmsReceiveCreatPage } from './wms-receive-create-page'
import { WmsReceiveMainPage } from './wms-receive-main-page'
// import * as v8toIstanbul from 'v8-to-istanbul' // TypeError: v8toIstanbul is not a function



faker.setLocale( 'zh_TW' )



async function getRandomMaterial ( request: APIRequestContext ) {
  const response = await request.get( '/api/materials/' )
  const materialList: MaterialRead[] = await response.json()
  return sample( materialList )
}



test.describe( 'WMS:Receive', () => {
  test( 'Create a new receive', async ( { browserName, page, playwright, baseURL } ) => {
    const requestContext = await playwright.request.newContext( {
      baseURL: baseURL, extraHTTPHeaders: { Authorization: 'Basic YWRtaW46YWRtaW5wYXNzd29yZA==' }
    } )

    if ( browserName == 'chromium' ) {
      await page.coverage.startJSCoverage()
      await page.coverage.startCSSCoverage()
    }

    const startPage = new StartPage( page )
    await startPage.goto()
    await startPage.clickWmsApp()

    const wmsLoginPage = new WmsLoginPage( page )
    await wmsLoginPage.login()

    const wmsHomePage = new WmsHomePage( page )
    await wmsHomePage.goToReceives()

    const wmsReceiveMainPage = new WmsReceiveMainPage( page )
    await wmsReceiveMainPage.createReceive()

    const wmsReceiveCreatPage = new WmsReceiveCreatPage( page )

    // Fill a random vendor
    const vendorListResponse = await requestContext.get( '/api/vendors/' )
    const vendorList: VendorRead[] = await vendorListResponse.json()
    const vendor = sample( vendorList )
    await wmsReceiveCreatPage.fillVendor( vendor.idno )

    // Add a random material and quantity
    const material: MaterialRead = await getRandomMaterial( requestContext )
    let q = faker.datatype.number( { min: 1, max: 100, precision: 0.1 } )
    q += material.qty_per_pack
    await wmsReceiveCreatPage.addReceiveMaterial( material.idno, q )

    let rowsDiv = page.locator( '.ag-center-cols-container > div' )
    let row = rowsDiv.filter( { hasText: material.idno } )
    expect( row ).toBeTruthy()

    await wmsReceiveCreatPage.submit()

    await page.waitForTimeout( 1000 ) // Force wait!!!
    let rowsDivHandle = await page.waitForSelector( '.ag-center-cols-container > div' ) // Magic wait!!!
    rowsDiv = page.locator( '.ag-center-cols-container > div' )
    let firstRowDiv = rowsDiv.first().dispatchEvent( 'dblclick' ) // `.dblclick()` does not wok on Webkit
    await page.waitForTimeout( 1000 ) // Force wait!!!

    rowsDivHandle = await page.waitForSelector( '.ag-center-cols-container > div' ) // Magic wait!!!

    rowsDiv = page.locator( '.ag-center-cols-container > div' )
    row = rowsDiv.filter( { hasText: material.idno } )
    expect( row ).toBeTruthy()

    row = rowsDiv.filter( { hasText: material.idno } )
    expect( row ).toBeTruthy()

    if ( browserName == 'chromium' ) {
      const jsCoverage = await page.coverage.stopJSCoverage()
      for ( const entry of jsCoverage ) {
        // const converter = v8toIstanbul( '', 0, { source: entry.source } ) // TypeError: v8toIstanbul is not a function
        // await converter.load()
        // converter.applyCoverage(entry.functions)
        // console.log( JSON.stringify(converter.toIstanbul()) )
      }

      const cssCoverage = await page.coverage.stopCSSCoverage()
      for ( const entry of cssCoverage ) { console.log( entry ) }
    }
  } )
} )
