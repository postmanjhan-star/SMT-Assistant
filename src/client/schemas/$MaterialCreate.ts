/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MaterialCreate = {
    properties: {
        idno: {
            type: 'string',
            isRequired: true,
        },
        name: {
            type: 'string',
        },
        qty_per_pack: {
            type: 'number',
            isRequired: true,
        },
        expiry_days: {
            type: 'number',
        },
        unit: {
            type: 'UnitEnum',
            isRequired: true,
        },
        description: {
            type: 'string',
        },
    },
} as const;