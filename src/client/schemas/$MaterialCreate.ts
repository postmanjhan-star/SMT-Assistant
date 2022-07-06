/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MaterialCreate = {
    properties: {
        expiry_days: {
    type: 'number',
},
        idno: {
    type: 'string',
    isRequired: true,
},
        qty_per_pack: {
    type: 'number',
    isRequired: true,
},
        unit: {
    type: 'UnitEnum',
    isRequired: true,
},
        name: {
    type: 'string',
},
        description: {
    type: 'string',
},
    },
} as const;