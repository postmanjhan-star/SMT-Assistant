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
        material_inventory_idno: {
    type: 'string',
    isRequired: true,
},
        material_id: {
    type: 'number',
    isRequired: true,
},
        material_idno: {
    type: 'string',
    isRequired: true,
},
        material_name: {
    type: 'string',
    isRequired: true,
},
        material_description: {
    type: 'string',
    isRequired: true,
},
        l1_storage_id: {
    type: 'number',
    isRequired: true,
},
        l1_storage_idno: {
    type: 'string',
    isRequired: true,
},
        l2_storage_id: {
    type: 'number',
    isRequired: true,
},
        l2_storage_idno: {
    type: 'string',
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