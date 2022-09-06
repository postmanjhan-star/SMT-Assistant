/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MaterialInventoryRecordRead = {
    properties: {
        id: {
    type: 'number',
    isRequired: true,
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
        material_inventory_id: {
    type: 'number',
},
        l1_storage_id: {
    type: 'number',
    isRequired: true,
},
        l2_storage_id: {
    type: 'number',
    isRequired: true,
},
        delta_qty: {
    type: 'number',
    isRequired: true,
},
        cause: {
    type: 'InventoryChangeCauseEnum',
    isRequired: true,
},
        issuance_item_id: {
    type: 'number',
},
    },
} as const;
