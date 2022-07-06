/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MaterialRead = {
    properties: {
        expiry_days: {
    type: 'number',
    isRequired: true,
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
        id: {
    type: 'number',
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