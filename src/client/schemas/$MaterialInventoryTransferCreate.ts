/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MaterialInventoryTransferCreate = {
    properties: {
        to_l2_storage_id: {
    type: 'number',
    isRequired: true,
},
        quantity: {
    type: 'number',
},
        major: {
    type: 'boolean',
    isRequired: true,
},
    },
} as const;