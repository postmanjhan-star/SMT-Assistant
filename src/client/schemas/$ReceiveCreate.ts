/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ReceiveCreate = {
    properties: {
        st_record_idno: {
    type: 'string',
},
        vendor_id: {
    type: 'number',
    isRequired: true,
},
        st_recieve_idno: {
    type: 'string',
},
        st_mbr_idno: {
    type: 'string',
},
        vendor_shipping_idno: {
    type: 'string',
},
        purchase_idno: {
    type: 'string',
},
        memo: {
    type: 'string',
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