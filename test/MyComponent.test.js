import { test } from "vitest";
import { render } from "@testing-library/vue";
import LoginView from "../src/views/RegisterView.vue"

test( 'it should work', () => {
    const { getByText } = render( LoginView, {

    } )
    
    // 断言输出
    getByText( '...' );
} );
