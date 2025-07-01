/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $IssuanceItemCreate = {
    properties: {
        material_inventory_id: {
    type: 'number',
    isRequired: true,
},
        issue_qty: {
    type: 'any-of',
    contains: [{
    type: 'number',
}, {
    type: 'string',
}],
    isRequired: true,
},
        lend_qty: {
    type: 'any-of',
    contains: [{
    type: 'number',
}, {
    type: 'string',
}],
},
        retain_qty: {
    type: 'any-of',
    contains: [{
    type: 'number',
}, {
    type: 'string',
}],
},
    },
} as const;
