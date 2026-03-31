import { Page } from '@playwright/test';

export function setupExpiredAuthToken(page: Page): Promise<void> {
    return page.addInitScript(() => {
        localStorage.setItem('authorized', JSON.stringify({
            OAuth2PasswordBearer: {
                schema: { flow: 'password', tokenUrl: '', scopes: {}, type: 'oauth2' },
                token: { access_token: 'expired-token', token_type: 'bearer' },
                username: 'operator',
                employee: { idno: 'OP001', full_name: 'operator' },
            },
            HTTPBasic: null,
            tokenExpiresAt: Date.now() - 1000,
        }));
    });
}

export function setupFutureExpiryAuthToken(page: Page, expiresInSeconds = 3600): Promise<void> {
    return page.addInitScript(({ secs }) => {
        localStorage.setItem('authorized', JSON.stringify({
            OAuth2PasswordBearer: {
                schema: { flow: 'password', tokenUrl: '', scopes: {}, type: 'oauth2' },
                token: { access_token: 'valid-token', token_type: 'bearer' },
                username: 'operator',
                employee: { idno: 'OP001', full_name: 'operator' },
            },
            HTTPBasic: null,
            tokenExpiresAt: Date.now() + secs * 1000,
        }));
    }, { secs: expiresInSeconds });
}

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
