/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $IssuanceItem = {
    description: `Represents a IssuanceItem record`,
    properties: {
        id: {
    type: 'number',
    isRequired: true,
},
        created_at: {
    type: 'string',
    isRequired: true,
    format: 'date-time',
},
        updated_at: {
    type: 'string',
    isRequired: true,
    format: 'date-time',
},
        issuance_id: {
    type: 'number',
    isRequired: true,
},
        issuance: {
    type: 'Issuance',
},
        material_inventory_id: {
    type: 'number',
    isRequired: true,
},
        material_inventory: {
    type: 'MaterialInventory',
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