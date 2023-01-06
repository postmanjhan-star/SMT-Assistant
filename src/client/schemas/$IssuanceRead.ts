/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $IssuanceRead = {
    properties: {
        id: {
    type: 'number',
    isRequired: true,
},
        created_at: {
    type: 'string',
    isRequired: true,
    format: 'date',
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
    format: 'date',
},
        employee_id: {
    type: 'number',
    isRequired: true,
},
        memo: {
    type: 'string',
    isRequired: true,
},
        issuing_completed: {
    type: 'boolean',
    isRequired: true,
},
        issuance_items: {
    type: 'array',
    contains: {
        type: 'IssuanceItemRead',
    },
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
