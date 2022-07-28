/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MaterialStockRecord = {
    properties: {
        date: {
    type: 'string',
    isRequired: true,
    format: 'date',
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