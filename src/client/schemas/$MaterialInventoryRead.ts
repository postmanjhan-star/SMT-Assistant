/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MaterialInventoryRead = {
    properties: {
        id: {
    type: 'number',
    isRequired: true,
},
        idno: {
    type: 'string',
    isRequired: true,
},
        parent_material_inventory_id: {
    type: 'number',
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
        l1_storage_id: {
    type: 'number',
},
        l1_storage_idno: {
    type: 'string',
},
        l2_storage_id: {
    type: 'number',
},
        l2_storage_idno: {
    type: 'string',
},
        latest_qty: {
    type: 'number',
    isRequired: true,
},
        receive_item_id: {
    type: 'number',
},
        issuing_locked: {
    type: 'boolean',
    isRequired: true,
},
        date_of_expiry: {
    type: 'string',
    isRequired: true,
    format: 'date',
},
        st_barcode: {
    type: 'string',
},
    },
} as const;
