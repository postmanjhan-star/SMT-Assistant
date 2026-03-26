import { Page } from '@playwright/test';

export async function setupAuthToken(page: Page): Promise<void> {
    const loginRes = await page.request.post('http://localhost/api/session/login', {
        form: { username: 'operator', password: 'operatorpassword' },
    });
    if (!loginRes.ok()) {
        const body = await loginRes.text();
        throw new Error(`Login failed (${loginRes.status()}): ${body.substring(0, 300)}`);
    }
    let loginBody: any;
    try {
        loginBody = await loginRes.json();
    } catch (e) {
        const text = await loginRes.text();
        throw new Error(`Failed to parse login response JSON: ${text.substring(0, 300)}`);
    }
    const { access_token, token_type } = loginBody;

    await page.addInitScript(({ access_token, token_type }) => {
        localStorage.setItem('authorized', JSON.stringify({
            OAuth2PasswordBearer: {
                schema: { flow: 'password', tokenUrl: '', scopes: {}, type: 'oauth2' },
                token: { access_token, token_type },
                username: 'operator',
                employee: { idno: 'OP001', full_name: 'operator' },
            },
            HTTPBasic: null,
        }));
    }, { access_token, token_type });
}
