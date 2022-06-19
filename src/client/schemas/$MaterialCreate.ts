/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MaterialCreate = {
    properties: {
        name: {
            type: 'string',
            isRequired: true,
        },
        expiry_days: {
            type: 'number',
        },
        idno: {
            type: 'string',
            isRequired: true,
        },
    },
} as const;