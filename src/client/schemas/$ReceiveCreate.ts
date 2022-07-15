/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ReceiveCreate = {
    properties: {
        vendor_id: {
    type: 'number',
    isRequired: true,
},
        st_mbr_idno: {
    type: 'string',
},
        purchase_idno: {
    type: 'string',
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
        vendor_shipping_idno: {
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