/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $IssuanceCreate = {
    properties: {
        memo: {
    type: 'string',
},
        st_erp_work_order_idno: {
    type: 'string',
},
        st_erp_work_order_date: {
    type: 'string',
    format: 'date',
},
        st_erp_work_order_due_date: {
    type: 'string',
    format: 'date',
},
        st_erp_product_idno: {
    type: 'string',
},
        st_erp_product_due_quanity: {
    type: 'number',
},
        st_erp_production_department: {
    type: 'string',
},
        st_erp_production_line: {
    type: 'string',
},
    },
} as const;
