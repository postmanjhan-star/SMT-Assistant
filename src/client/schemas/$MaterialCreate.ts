/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MaterialCreate = {
    properties: {
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
        idno: {
    type: 'string',
    isRequired: true,
},
        expiry_days: {
    type: 'number',
},
    },
} as const;