/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $L1Storage = {
    description: `Represents a L1Storage record`,
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
        type: {
    type: 'StorageTypeEnum',
    isRequired: true,
},
        l2_storages: {
    type: 'array',
    contains: {
        type: 'L2Storage',
    },
},
        vendors: {
    type: 'array',
    contains: {
        type: 'Vendor',
    },
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
    },
} as const;