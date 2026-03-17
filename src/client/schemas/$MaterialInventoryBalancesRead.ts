/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MaterialInventoryBalancesRead = {
    properties: {
        l1_storage_id: {
            type: 'number',
            isRequired: true,
        },
        l1_storage_idno: {
            type: 'string',
            isRequired: true,
        },
        l1_storage_type: {
            type: 'StorageTypeEnum',
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
        quantity: {
            type: 'string',
            isRequired: true,
        },
    },
} as const;
