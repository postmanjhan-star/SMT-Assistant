import { faker } from '@faker-js/faker/locale/zh_TW';
import { expect, test } from '@playwright/test';

import { SeastoneSmartRackCreate } from '../src/client/index';

faker.setLocale( 'zh_TW' )

const rack: SeastoneSmartRackCreate = {
  server_address: faker.internet.url(),
  rack_idno: faker.random.alphaNumeric( 5, { casing: 'upper' } ),
  wifi_ip: faker.internet.ip(),
  wifi_mac: faker.internet.mac(),
  eth_ip: faker.internet.ip(),
  eth_mac: faker.internet.mac(),
  dev_id: faker.git.shortSha(),
}
console.debug( rack )


test( 'Creating a new rack', async ( { page } ) => {
  await page.goto( '/wms/login' );
  await page.locator( '#username' ).fill( 'admin' )
  await page.locator( '#password' ).fill( 'adminpassword' )
  await page.locator( '#password' ).press( 'Enter' )

  await page.getByRole( 'link', { name: '智慧料架管理' } ).click()
  await page.getByRole( 'button', { name: '建立料架' } ).click()

  await page.locator( '#server_address' ).fill( rack.server_address )
  await page.locator( '#rack_idno' ).fill( rack.rack_idno )
  await page.locator( '#wifi_ip' ).fill( rack.wifi_ip )
  await page.locator( '#wifi_mac' ).fill( rack.wifi_mac )
  await page.locator( '#eth_ip' ).fill( rack.eth_ip )
  await page.locator( '#eth_mac' ).fill( rack.eth_mac )
  await page.locator( '#dev_id' ).fill( rack.dev_id )
  await page.locator( '#dev_id' ).press( 'Enter' )

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
