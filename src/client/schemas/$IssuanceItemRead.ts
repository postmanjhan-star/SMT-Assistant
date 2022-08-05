/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $IssuanceItemRead = {
    properties: {
        id: {
    type: 'number',
    isRequired: true,
},
        issuance_id: {
    type: 'number',
    isRequired: true,
},
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