/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ProductRead = {
    properties: {
        id: {
    type: 'number',
    isRequired: true,
},
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
    isRequired: true,
},
        expiry_days: {
    type: 'number',
    isRequired: true,
},
    },
} as const;
