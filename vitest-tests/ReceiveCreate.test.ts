import { fireEvent, render } from '@testing-library/vue'
import ReceiveCreate from '../src/wms-app/receives/ReceiveCreate.vue'



// 沒有引入 vitest 為何可以直接呼叫 `test()`？
// 秘密就在 vite.config.ts 的 test 區段內啟用了 vitest 全域 API。
test( 'it should work', async () => {
    const { container, getByLabelText, getByRole } = render( ReceiveCreate )

    const foo = getByLabelText( '物料代碼' )
    const materialIdnoInput = container.querySelector('#material_idno')
    await fireEvent.update(materialIdnoInput, '38G57-7840-M1')

    const addButton = getByRole('button', {name: '增加物料'})
    await fireEvent.click(addButton)
} )

// [naive/use-message]: No outer <n-message-provider /> founded. See prerequisite in https://www.naiveui.com/en-US/os-theme/components/message for more details. If you want to use `useMessage` outside setup, please check https://www.naiveui.com/zh-CN/os-theme/components/message#Q-&-A.
