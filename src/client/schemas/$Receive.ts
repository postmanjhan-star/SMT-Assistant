/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Receive = {
    description: `Represents a Receive record`,
    properties: {
        id: {
    type: 'number',
    isRequired: true,
},
        created_at: {
    type: 'string',
    isRequired: true,
    format: 'date-time',
},
        updated_at: {
    type: 'string',
    isRequired: true,
    format: 'date-time',
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
        vendor: {
    type: 'Vendor',
},
        vendor_shipping_idno: {
    type: 'string',
},
        employee_id: {
    type: 'number',
    isRequired: true,
},
        employee: {
    type: 'Employee',
},
        memo: {
    type: 'string',
},
        purchase_idno: {
    type: 'string',
},
        receive_items: {
    type: 'array',
    contains: {
        type: 'ReceiveItem',
    },
},
        st_receive_idno: {
    type: 'string',
},
        st_record_idno: {
    type: 'string',
},
        st_mbr_idno: {
    type: 'string',
},
    },
} as const;