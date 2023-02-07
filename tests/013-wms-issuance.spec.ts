import { faker } from '@faker-js/faker/locale/zh_TW'
import { APIRequestContext, expect, test } from '@playwright/test'
import { sample } from 'lodash'
import { MaterialInventoryRead, MaterialRead } from '../src/client/index'
import { StartPage } from './start-page'
import { WmsHomePage } from './wms-home-page'
import { WmsIssuanceCreatPage } from './wms-issuance-create-page'
import { WmsIssuanceMainPage } from './wms-issuance-main-page'
import { WmsLoginPage } from './wms-login-page'

faker.setLocale( 'zh_TW' )

function generateIssuanceMemo (): string { return faker.lorem.lines() }

async function getRandomMaterial ( request: APIRequestContext ) {
  const response = await request.get( '/api/materials/' )
  const materialList: MaterialRead[] = await response.json()
  return sample( materialList )
}

async function getMaterialIssuableBalance ( request: APIRequestContext, materialIdno: string ) {
  const response = await request.get( `/api/issuances/issuable_balance/${ materialIdno }` )
  const balance: number = await response.json()
  return balance
}

// test.use({ viewport: { width: 500, height: 500 } });

test.describe( 'WMS:Issuance', () => {
  test( 'Create a new issuance', async ( { page, request, playwright, baseURL } ) => {
    const requestContext = await playwright.request.newContext( {
      baseURL: baseURL, extraHTTPHeaders: { Authorization: 'Basic YWRtaW46YWRtaW5wYXNzd29yZA==' }
    } )

    const startPage = new StartPage( page )
    await startPage.goto()
    await startPage.clickWmsApp()

    const wmsLoginPage = new WmsLoginPage( page )
    await wmsLoginPage.login()

    const wmsHomePage = new WmsHomePage( page )
    await wmsHomePage.goToIssuances()

    const wmsIssuanceMainPage = new WmsIssuanceMainPage( page )
    await wmsIssuanceMainPage.createIssuance()

    const wmsIssuanceCreatPage = new WmsIssuanceCreatPage( page )

    const issuanceMemo = generateIssuanceMemo()
    await wmsIssuanceCreatPage.fillMemo( issuanceMemo )

    let material: MaterialRead
    let materialIssuableBalance: number
    while ( true ) {
      material = await getRandomMaterial( requestContext )
      materialIssuableBalance = await getMaterialIssuableBalance( requestContext, material.idno )
      if ( materialIssuableBalance > 0 ) { break }
    }
    const q = faker.datatype.number( { min: 1, max: materialIssuableBalance } )
    await wmsIssuanceCreatPage.addIssuanceItemByMaterialIdno( material.idno, q )

    while ( true ) {
      material = await getRandomMaterial( requestContext )
      materialIssuableBalance = await getMaterialIssuableBalance( requestContext, material.idno )
      if ( materialIssuableBalance > 0 ) { break }
    }
    const response = await requestContext.get( `/api/issuances/issuable_material_inventories/${ material.idno }` )
    const inventoryList: MaterialInventoryRead[] = await response.json()
    // console.debug( inventoryList )
    const inventory = sample( inventoryList )
    await wmsIssuanceCreatPage.addIssuanceItemByInventoryIdno( inventory.idno )
    let rowsDiv = page.locator( '.ag-center-cols-container > div' )
    let row = rowsDiv.filter( { hasText: inventory.idno } )
    expect( row ).toBeTruthy()

    await wmsIssuanceCreatPage.submit()

    await page.waitForTimeout( 1000 ) // Force wait!!!
    let rowsDivHandle = await page.waitForSelector( '.ag-center-cols-container > div' ) // Magic wait!!!
    rowsDiv = page.locator( '.ag-center-cols-container > div' )
    let firstRowDiv = rowsDiv.first().dispatchEvent( 'dblclick' ) // `.dblclick()` does not wok on Webkit
    await page.waitForTimeout( 1000 ) // Force wait!!!

    const memo = page.locator( '#memo' )
    expect( await memo.inputValue() ).toBe( issuanceMemo )

    rowsDivHandle = await page.waitForSelector( '.ag-center-cols-container > div' ) // Magic wait!!!

    rowsDiv = page.locator( '.ag-center-cols-container > div' )
    row = rowsDiv.filter( { hasText: material.idno } )
    expect( row ).toBeTruthy()

    row = rowsDiv.filter( { hasText: inventory.idno } )
    expect( row ).toBeTruthy()
  } )
} )
