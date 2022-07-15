/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ReceiveRead = {
    properties: {
        idno: {
    type: 'string',
    isRequired: true,
},
        vendor_id: {
    type: 'number',
    isRequired: true,
},
        st_mbr_idno: {
    type: 'string',
},
        date: {
    type: 'string',
    isRequired: true,
    format: 'date-time',
},
        st_record_idno: {
    type: 'string',
},
        st_receive_idno: {
    type: 'string',
},
        memo: {
    type: 'string',
},
        employee_id: {
    type: 'number',
    isRequired: true,
},
        purchase_idno: {
    type: 'string',
},
        vendor_shipping_idno: {
    type: 'string',
},
        id: {
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
        receive_items: {
    type: 'array',
    contains: {
        type: 'ReceiveItemRead',
    },
    isRequired: true,
},
    },
} as const;