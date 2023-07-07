/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $InProcessMaterialCreate = {
    properties: {
        idno: {
    type: 'string',
    isRequired: true,
},
        material_type: {
    type: 'all-of',
    contains: [{
    type: 'MaterialTypeEnum',
}],
},
        name: {
    type: 'string',
},
        description: {
    type: 'string',
},
        unit: {
    type: 'all-of',
    contains: [{
    type: 'UnitEnum',
}],
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
