/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ReceiveCreate = {
    properties: {
        vendor_id: {
            type: 'number',
            isRequired: true,
        },
        vendor_shipping_idno: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
            isRequired: true,
        },
        memo: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
            isRequired: true,
        },
        purchase_idno: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
            isRequired: true,
        },
        st_receive_idno: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        st_mbr_idno: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
            isRequired: true,
        },
        receive_items: {
            type: 'array',
            contains: {
                type: 'ReceiveItemCreate',
            },
            isRequired: true,
        },
    },
} as const;
