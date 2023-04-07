import { render, screen, fireEvent } from '@testing-library/vue'
import { expect, test } from 'vitest'
import { createMetaManager } from 'vue-meta'
import { PanasonicMounterFileRead } from '../src/client'
import router from '../src/router/index'
import HomeView from '../src/smt-app/HomeView.vue'

const panasonicMounterFileRead: PanasonicMounterFileRead = {
    id: 123,
    updated_at: 'dd',
    product_idno: 'dd',
    product_ver: 'dd',
    mounter_idno: 'ff',
    board_side: 'T',
    panasonic_mounter_file_items: [],
}

test( '1 + 1', async () => {
    render( HomeView, {
        // props: {mounterFileRead: panasonicMounterFileRead}
        global: { plugins: [ router, createMetaManager() ] },
    } )

    const panasonicLink = screen.getByText('松下打件機上料助手')
    await fireEvent.click(panasonicLink)

    const fileManagerLink = screen.getByText('打件檔管理')
    await fireEvent.click(fileManagerLink)


    expect( 1 + 1 ).toEqual( 2 )
} )
