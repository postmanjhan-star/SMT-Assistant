import { faker } from '@faker-js/faker/locale/zh_TW'
import { expect, test } from '@playwright/test'
import { StartPage } from './start-page'
import { WmsHomePage } from './wms-home-page'
import { WmsLoginPage } from './wms-login-page'
import { WmsSmartRackCreatPage } from './wms-smart-rack-create-page'
import { WmsSmartRackMainPage } from './wms-smart-rack-main-page'

import { SeastoneSmartRackCreate } from '../src/client/index'

faker.setLocale( 'zh_TW' )

const storageL1Idno = 'SYSTEM'

const rack: SeastoneSmartRackCreate = {
  l1_storage_id: 1, // SYSTEM
  server_address: faker.internet.url(),
  rack_idno: `${ faker.random.alpha( { casing: 'upper' } ) }${ faker.random.numeric( 3, { allowLeadingZeros: true } ) }`,
  wifi_ip: faker.internet.ip(),
  wifi_mac: faker.internet.mac(),
  eth_ip: faker.internet.ip(),
  eth_mac: faker.internet.mac(),
  dev_id: faker.git.shortSha(),
}
// console.debug( rack )


test( 'Creating a new rack', async ( { page } ) => {

  const startPage = new StartPage( page )
  await startPage.goto()
  await startPage.clickWmsApp()

  const wmsLoginPage = new WmsLoginPage( page )
  await wmsLoginPage.login()

  const wmsHomePage = new WmsHomePage( page )
  await wmsHomePage.goToSmartRacks()

  const wmsSmartRackMainPage = new WmsSmartRackMainPage( page )
  await wmsSmartRackMainPage.createSmartRack()

  const wmsSmartRackCreatPage = new WmsSmartRackCreatPage( page, rack, storageL1Idno )
  await wmsSmartRackCreatPage.fillForm()
  await wmsSmartRackCreatPage.submit()

  const rowsDiv = page.locator( '.ag-center-cols-container > div' )

  let createdRowVisibleInGrid = false
  while ( !createdRowVisibleInGrid ) {
    if ( await page.isVisible( `text=${ rack.dev_id }` ) ) { createdRowVisibleInGrid = true }
    else { await page.locator( 'div[ref="btNext"]' ).click() }
  }

  const rowDiv = rowsDiv.filter( { hasText: rack.rack_idno } )
  await rowDiv.dispatchEvent( 'dblclick' ) // `.dblclick()` does not wok on Webkit

  const heading = page.locator( '#heading1' )
  expect( await heading.textContent() ).toBe( rack.rack_idno )
} );
