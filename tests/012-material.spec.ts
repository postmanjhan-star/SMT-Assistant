import { faker } from '@faker-js/faker/locale/zh_TW'
import { expect, test } from '@playwright/test'
import { readFile, utils, writeFile } from 'xlsx'
import { StartPage } from './start-page'
import { WmsHomePage } from './wms-home-page'
import { WmsLoginPage } from './wms-login-page'
import { WmsMaterialBatchCreatPage } from './wms-material-batch-create-page'
import { WmsMaterialMainPage } from './wms-material-main-page'

import { MaterialCreate, MaterialTypeEnum, UnitEnum } from '../src/client/index'



faker.setLocale( 'zh_TW' )

function generateMaterial () {
  const material: MaterialCreate = {
    idno: `${ faker.random.numeric( 2, { allowLeadingZeros: true } ) }${ faker.random.alpha( { casing: 'upper', count: 1 } ) }${ faker.random.numeric( 2, { allowLeadingZeros: true } ) }-${ faker.random.numeric( 4, { allowLeadingZeros: true } ) }-${ faker.random.alpha( { casing: 'upper' } ) }${ faker.random.numeric( 1, { allowLeadingZeros: true } ) }`, // 32A00-1001-S0
    material_type: MaterialTypeEnum.RAW_MATERIAL,
    name: faker.commerce.productMaterial(),
    description: faker.commerce.productAdjective(),
    unit: UnitEnum.PIECE,
    qty_per_pack: faker.datatype.number( { min: 1, max: 2000 } ),
    expiry_days: faker.datatype.number( { min: 365, max: 3650 } ),
  }
  return material
}


function updateBatchOdsFile ( odsFilePath: string, material: MaterialCreate ) {
  const wb = readFile( odsFilePath )
  const ws = wb.Sheets[ '工作表1' ]
  utils.sheet_add_aoa(
    ws,
    [
      [ material.idno, material.material_type, material.name, material.description, material.unit, material.qty_per_pack, material.expiry_days ], // Row 5
    ],
    { origin: 'A5' },
  )
  writeFile( wb, odsFilePath, { compression: true } )
  return true
}


test( 'Batch create new materials from a ODS file', async ( { page } ) => {

  const odsFilePath = './tests/material_create_test_1.0.ods'

  const material = generateMaterial()
  console.debug( material )

  const odsFileUpdated = updateBatchOdsFile( odsFilePath, material )
  console.debug( odsFileUpdated )

  const startPage = new StartPage( page )
  await startPage.goto()
  await startPage.clickWmsApp()

  const wmsLoginPage = new WmsLoginPage( page )
  await wmsLoginPage.login()

  const wmsHomePage = new WmsHomePage( page )
  await wmsHomePage.goToMaterials()

  const wmsMaterialMainPage = new WmsMaterialMainPage( page )
  await wmsMaterialMainPage.batchCreate()

  const wmsMaterialBatchCreatPage = new WmsMaterialBatchCreatPage( page, odsFilePath )
  await wmsMaterialBatchCreatPage.openFile()
  await wmsMaterialBatchCreatPage.submit()
  await wmsMaterialBatchCreatPage.goToMaterialMainPage()

  const rowsDivHandle = await page.waitForSelector( '.ag-center-cols-container > div' ) // Magic wait!!!

  const rowsDiv = page.locator( '.ag-center-cols-container > div' )

  let createdRowVisibleInGrid = false
  while ( !createdRowVisibleInGrid ) {
    if ( await page.isVisible( `text=${ material.idno }` ) ) { createdRowVisibleInGrid = true }
    else { await page.locator( 'div[ref="btNext"]' ).click() }
  }

  const rowDiv = rowsDiv.filter( { hasText: material.idno } )
  await rowDiv.dispatchEvent( 'dblclick' ) // `.dblclick()` does not wok on Webkit

  await page.waitForTimeout(300) // Force wait!!!

  const idno = page.locator( '#idno' )
  expect( await idno.inputValue() ).toBe( material.idno )

  const name = page.locator( '#name' )
  expect( await name.inputValue() ).toBe( material.name )

  const description = page.locator( '#description' )
  expect( await description.inputValue() ).toBe( material.description )

  const unit = page.locator( '#unit' )
  expect( await unit.inputValue() ).toBe( material.unit )

  const qty_per_pack = page.locator( '#qtyPerPack' )
  expect( await qty_per_pack.inputValue() ).toBe( material.qty_per_pack.toLocaleString() )

  const expiry_days = page.locator( '#expiryDays' )
  expect( await expiry_days.inputValue() ).toBe( material.expiry_days.toLocaleString() )
} )
