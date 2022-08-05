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
    isRequired: true,
},
        cause: {
    type: 'InventoryChangeCauseEnum',
    isRequired: true,
},
    },
} as const;