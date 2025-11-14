/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ProductCreate = {
    properties: {
        idno: {
    type: 'string',
    isRequired: true,
},
        material_type: {
    type: 'MaterialTypeEnum',
},
        name: {
    type: 'any-of',
    contains: [{
    type: 'string',
}, {
    type: 'null',
}],
    isRequired: true,
},
        description: {
    type: 'any-of',
    contains: [{
    type: 'string',
}, {
    type: 'null',
}],
    isRequired: true,
},
        unit: {
    type: 'UnitEnum',
    isRequired: true,
},
        qty_per_pack: {
    type: 'any-of',
    contains: [{
    type: 'number',
}, {
    type: 'string',
}],
},
        expiry_days: {
    type: 'number',
},
    },
} as const;
