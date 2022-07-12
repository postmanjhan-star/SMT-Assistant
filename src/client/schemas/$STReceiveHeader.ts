/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $STReceiveHeader = {
    properties: {
        idno: {
    type: 'string',
    isRequired: true,
},
        st_erp_record_idno: {
    type: 'string',
    isRequired: true,
},
        st_purchase_idno: {
    type: 'string',
    isRequired: true,
},
        st_part_idno: {
    type: 'string',
    isRequired: true,
},
        st_vendor_idno: {
    type: 'string',
    isRequired: true,
},
        receive_date: {
    type: 'string',
    isRequired: true,
    format: 'date',
},
        total_qty: {
    type: 'number',
    isRequired: true,
},
        qualify_qty: {
    type: 'number',
    isRequired: true,
},
        st_mbr_idno: {
    type: 'string',
    isRequired: true,
},
    },
} as const;