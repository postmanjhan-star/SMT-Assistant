/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Material = {
    description: `Represents a Material record`,
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
},
        description: {
    type: 'string',
},
        unit: {
    type: 'UnitEnum',
    isRequired: true,
},
        qty_per_pack: {
    type: 'number',
    isRequired: true,
},
        expiry_days: {
    type: 'number',
    isRequired: true,
},
        receive_items: {
    type: 'array',
    contains: {
        type: 'ReceiveItem',
    },
},
        inventories: {
    type: 'array',
    contains: {
        type: 'MaterialInventory',
    },
},
        inventory_records: {
    type: 'array',
    contains: {
        type: 'MaterialInventoryRecord',
    },
},
    },
} as const;