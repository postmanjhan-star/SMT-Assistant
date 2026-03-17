/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ReceiveRead = {
    properties: {
        id: {
            type: 'number',
            isRequired: true,
        },
        idno: {
            type: 'string',
            isRequired: true,
        },
        date: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
        vendor_id: {
            type: 'number',
            isRequired: true,
        },
        vendor_idno: {
            type: 'string',
            isRequired: true,
        },
        vendor_name: {
            type: 'string',
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
        employee_id: {
            type: 'number',
            isRequired: true,
        },
        receive_items: {
            type: 'array',
            contains: {
                type: 'ReceiveItemRead',
            },
            isRequired: true,
        },
        st_receive_idno: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
            isRequired: true,
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
        receive_day: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
        receive_type: {
            type: 'ReceiveTypeEnum',
            isRequired: true,
        },
        putaway_verification: {
            type: 'boolean',
            isRequired: true,
        },
    },
} as const;
