/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ReceiveItem = {
    description: `Represents a ReceiveItem record`,
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
        receive_id: {
    type: 'number',
    isRequired: true,
},
        receive: {
    type: 'Receive',
},
        material_id: {
    type: 'number',
    isRequired: true,
},
        material: {
    type: 'Material',
},
        total_qty: {
    type: 'number',
    isRequired: true,
},
        qualify_qty: {
    type: 'number',
    isRequired: true,
},
        material_inventories: {
    type: 'array',
    contains: {
        type: 'MaterialInventory',
    },
},
        st_barcodes: {
    type: 'string',
    format: 'json-string',
},
    },
} as const;