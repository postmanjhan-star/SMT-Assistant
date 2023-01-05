import { faker } from '@faker-js/faker/locale/zh_TW'
import { APIRequestContext, expect, test } from '@playwright/test'
import { sample } from 'lodash'
import { IssuanceCreate, MaterialRead } from '../src/client/index'
import { StartPage } from './start-page'
import { WmsHomePage } from './wms-home-page'
import { WmsIssuanceCreatPage } from './wms-issuance-create-page'
import { WmsIssuanceMainPage } from './wms-issuance-main-page'
import { WmsLoginPage } from './wms-login-page'

faker.setLocale( 'zh_TW' )

function generateIssuanceCreate (): IssuanceCreate { return { memo: faker.lorem.lines() } }

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

    const issuanceCreate = generateIssuanceCreate()

    let material: MaterialRead
    let materialIssuableBalance: number
    while ( true ) {
      material = await getRandomMaterial( requestContext )
      materialIssuableBalance = await getMaterialIssuableBalance( requestContext, material.idno )
      if ( materialIssuableBalance > 0 ) { break }
    }

    const q = faker.datatype.number( { min: 1, max: materialIssuableBalance } )

    const wmsIssuanceCreatPage = new WmsIssuanceCreatPage( page, issuanceCreate.memo, material.idno, q )
    await wmsIssuanceCreatPage.fillMemo()
    await page.waitForTimeout(800) // Force wait!!!
    await wmsIssuanceCreatPage.addIssuanceItem()
    await page.waitForTimeout(1200) // Force wait!!!
    await wmsIssuanceCreatPage.submit()
    await page.waitForTimeout(1200) // Force wait!!!

    let rowsDivHandle = await page.waitForSelector( '.ag-center-cols-container > div' ) // Magic wait!!!

    await page.waitForTimeout(600) // Force wait!!!

    let rowsDiv = page.locator( '.ag-center-cols-container > div' )
    let firstRowDiv = rowsDiv.first().dispatchEvent( 'dblclick' ) // `.dblclick()` does not wok on Webkit

    await page.waitForTimeout(1200) // Force wait!!!

    const memo = page.locator( '#memo' )
    expect( await memo.inputValue() ).toBe( issuanceCreate.memo )

    rowsDivHandle = await page.waitForSelector( '.ag-center-cols-container > div' ) // Magic wait!!!

    rowsDiv = page.locator( '.ag-center-cols-container > div' )
    const row = rowsDiv.filter( { hasText: material.idno } )
    expect( row ).toBeTruthy()
  } )
} )
