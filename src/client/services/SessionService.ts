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
     * Login
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
            url: '/session/login',
            formData: formData,
            mediaType: 'application/x-www-form-urlencoded',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Refresh Tokens
     * Canonical refresh endpoint.
     *
     * Requires refresh token in `x-refresh-token` header.
     * @returns Token Successful Response
     * @throws ApiError
     */
    public static refreshTokens({
        xRefreshToken,
    }: {
        xRefreshToken: string,
    }): CancelablePromise<Token> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/session/refresh',
            headers: {
                'x-refresh-token': xRefreshToken,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * @deprecated
     * Refresh Tokens Legacy
     * Legacy refresh endpoint.
     *
     * Accepts refresh token from either `x-refresh-token` header or `refresh_token` cookie.
     * @returns Token Successful Response
     * @throws ApiError
     */
    public static refreshTokensLegacy({
        xRefreshToken,
        refreshToken,
    }: {
        xRefreshToken?: (string | null),
        refreshToken?: (string | null),
    }): CancelablePromise<Token> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/session/refresh',
            cookies: {
                'refresh_token': refreshToken,
            },
            headers: {
                'x-refresh-token': xRefreshToken,
            },
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
