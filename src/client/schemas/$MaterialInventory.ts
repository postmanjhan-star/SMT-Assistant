/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MaterialInventory = {
    description: `Represents a MaterialInventory record`,
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
        idno: {
    type: 'string',
    isRequired: true,
},
        material_id: {
    type: 'number',
    isRequired: true,
},
        material: {
    type: 'Material',
},
        material_inventory_records: {
    type: 'array',
    contains: {
        type: 'MaterialInventoryRecord',
    },
},
        l1_storage_id: {
    type: 'number',
    isRequired: true,
},
        l1_storage: {
    type: 'L1Storage',
},
        l2_storage_id: {
    type: 'number',
    isRequired: true,
},
        l2_storage: {
    type: 'L2Storage',
},
        latest_qty: {
    type: 'number',
    isRequired: true,
},
        receive_item_id: {
    type: 'number',
},
        receive_item: {
    type: 'ReceiveItem',
},
        issuance_item: {
    type: 'array',
    contains: {
        type: 'IssuanceItem',
    },
},
        st_barcode: {
    type: 'string',
},
    },
} as const;