/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MaterialInventoryRead = {
    properties: {
        id: {
            type: 'number',
            isRequired: true,
        },
        idno: {
            type: 'string',
            isRequired: true,
        },
        material_id: {
            type: 'number',
            isRequired: true,
        },
        material_idno: {
            type: 'string',
            isRequired: true,
        },
        material_name: {
            type: 'string',
            isRequired: true,
        },
        l1_storage_id: {
            type: 'number',
            isRequired: true,
        },
        l1_storage_idno: {
            type: 'string',
            isRequired: true,
        },
        l2_storage_id: {
            type: 'number',
            isRequired: true,
        },
        l2_storage_idno: {
            type: 'string',
            isRequired: true,
        },
        latest_qty: {
            type: 'number',
            isRequired: true,
        },
        receive_item_id: {
            type: 'number',
        },
        st_barcode: {
            type: 'string',
        },
    },
} as const;