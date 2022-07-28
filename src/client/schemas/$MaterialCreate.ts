/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MaterialCreate = {
    properties: {
        unit: {
    type: 'UnitEnum',
    isRequired: true,
},
        description: {
    type: 'string',
},
        idno: {
    type: 'string',
    isRequired: true,
},
        qty_per_pack: {
    type: 'number',
    isRequired: true,
},
        expiry_days: {
    type: 'number',
},
        name: {
    type: 'string',
},
    },
} as const;