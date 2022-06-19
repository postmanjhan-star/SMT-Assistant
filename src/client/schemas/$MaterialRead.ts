/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MaterialRead = {
    properties: {
        name: {
            type: 'string',
            isRequired: true,
        },
        id: {
            type: 'number',
            isRequired: true,
        },
        expiry_days: {
            type: 'number',
            isRequired: true,
        },
        idno: {
            type: 'string',
            isRequired: true,
        },
    },
} as const;