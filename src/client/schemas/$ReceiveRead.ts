/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ReceiveRead = {
    properties: {
        date: {
    type: 'string',
    isRequired: true,
    format: 'date-time',
},
        st_recieve_idno: {
    type: 'string',
},
        id: {
    type: 'number',
    isRequired: true,
},
        st_mbr_idno: {
    type: 'string',
},
        idno: {
    type: 'string',
    isRequired: true,
},
        memo: {
    type: 'string',
},
        st_record_idno: {
    type: 'string',
},
        employee_id: {
    type: 'number',
    isRequired: true,
},
        vendor_id: {
    type: 'number',
    isRequired: true,
},
        vendor_shipping_idno: {
    type: 'string',
},
        purchase_idno: {
    type: 'string',
},
        vendor_idno: {
    type: 'string',
    isRequired: true,
},
        vendor_name: {
    type: 'string',
    isRequired: true,
},
        receive_items: {
    type: 'array',
    contains: {
        type: 'ReceiveItemRead',
    },
    isRequired: true,
},
    },
} as const;