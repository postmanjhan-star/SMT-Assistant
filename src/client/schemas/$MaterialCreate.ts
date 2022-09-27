/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MaterialCreate = {
    properties: {
        idno: {
    type: 'string',
    isRequired: true,
},
        material_type: {
    type: 'MaterialTypeEnum',
    isRequired: true,
},
        name: {
    type: 'string',
},
        description: {
    type: 'string',
},
        unit: {
    type: 'UnitEnum',
    isRequired: true,
},
        qty_per_pack: {
    type: 'number',
},
        expiry_days: {
    type: 'number',
},
    },
} as const;
