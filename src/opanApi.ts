import { OpenAPI } from './client';
import type { Token } from './client';


const account: Token = JSON.parse( localStorage.getItem( 'account' ) );

if ( account && account.access_token ) {
    // OpenAPI.TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTY1Njg3MTgzMH0.5LbQpD-VJM8oqq2D0peXUIAUYyUJdLID-vuMVB9pXwM';
    OpenAPI.TOKEN = account.access_token;
}

export { OpenAPI };
