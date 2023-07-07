/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_login_for_access_token } from '../models/Body_login_for_access_token';
import type { Token } from '../models/Token';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class SessionService {

    /**
     * Login For Access Token
     * @returns Token Successful Response
     * @throws ApiError
     */
    public static loginForAccessToken({
formData,
}: {
formData: Body_login_for_access_token,
}): CancelablePromise<Token> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/session/',
            formData: formData,
            mediaType: 'application/x-www-form-urlencoded',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Refresh Tokens
     * This endpoint issues `refresh_token` as a cookie with `httponly`.
 *
 * An `httponly` cookie is unreadable for browser. It is more secure.
     * @returns Token Successful Response
     * @throws ApiError
     */
    public static refreshTokens(): CancelablePromise<Token> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/session/refresh',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Logout
     * @returns boolean Successful Response
     * @throws ApiError
     */
    public static logout(): CancelablePromise<boolean> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/session/logout',
        });
    }

}
