/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MaterialInventoryRecord = {
    description: `Represents a MaterialInventoryRecord record`,
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
        date: {
    type: 'string',
    isRequired: true,
    format: 'date-time',
},
        material_id: {
    type: 'number',
    isRequired: true,
},
        material: {
    type: 'Material',
},
        material_inventory_id: {
    type: 'number',
},
        material_inventory: {
    type: 'MaterialInventory',
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
        delta_qty: {
    type: 'number',
    isRequired: true,
},
        cause: {
    type: 'InventoryChangeCauseEnum',
    isRequired: true,
},
    },
} as const;