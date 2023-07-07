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
    type: 'string',
},
        memo: {
    type: 'string',
},
        purchase_idno: {
    type: 'string',
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
    type: 'string',
},
        st_mbr_idno: {
    type: 'string',
},
    },
} as const;
