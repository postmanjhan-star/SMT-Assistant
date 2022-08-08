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
    type: 'number',
    isRequired: true,
},
        lend_qty: {
    type: 'number',
    isRequired: true,
},
    },
} as const;