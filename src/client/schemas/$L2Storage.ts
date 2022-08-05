/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $L2Storage = {
    description: `Represents a L2Storage record`,
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
        name: {
    type: 'string',
    isRequired: true,
},
        l1_storage: {
    type: 'L1Storage',
},
        l1_storage_id: {
    type: 'number',
    isRequired: true,
},
        vendor: {
    type: 'Vendor',
},
        material_inventories: {
    type: 'array',
    contains: {
        type: 'MaterialInventory',
    },
},
        material_inventory_records: {
    type: 'array',
    contains: {
        type: 'MaterialInventoryRecord',
    },
},
        issuances: {
    type: 'array',
    contains: {
        type: 'Issuance',
    },
},
    },
} as const;