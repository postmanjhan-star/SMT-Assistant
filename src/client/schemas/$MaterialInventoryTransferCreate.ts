/* generated using openapi-typescript-codegen -- do no edit */
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
            type: 'any-of',
            contains: [{
                type: 'number',
            }, {
                type: 'string',
            }],
            isRequired: true,
        },
        major: {
            type: 'boolean',
            isRequired: true,
        },
    },
} as const;
