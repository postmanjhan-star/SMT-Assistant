/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MaterialCreate = {
    properties: {
        qty_per_pack: {
    type: 'number',
    isRequired: true,
},
        name: {
    type: 'string',
},
        unit: {
    type: 'UnitEnum',
    isRequired: true,
},
        expiry_days: {
    type: 'number',
},
        description: {
    type: 'string',
},
        idno: {
    type: 'string',
    isRequired: true,
},
    },
} as const;