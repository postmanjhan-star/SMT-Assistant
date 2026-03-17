/* generated using openapi-typescript-codegen -- do no edit */
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
            type: 'any-of',
            contains: [{
                type: 'string',
                format: 'date',
            }, {
                type: 'null',
            }],
            isRequired: true,
        },
        employee_id: {
            type: 'number',
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
        issuing_completed: {
            type: 'boolean',
            isRequired: true,
        },
        issuance_items: {
            type: 'any-of',
            contains: [{
                type: 'array',
                contains: {
                    type: 'IssuanceItemRead',
                },
            }, {
                type: 'null',
            }],
            isRequired: true,
        },
        st_erp_work_order_idno: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        st_erp_work_order_date: {
            type: 'any-of',
            contains: [{
                type: 'string',
                format: 'date',
            }, {
                type: 'null',
            }],
        },
        st_erp_work_order_due_date: {
            type: 'any-of',
            contains: [{
                type: 'string',
                format: 'date',
            }, {
                type: 'null',
            }],
        },
        st_erp_product_idno: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        st_erp_product_due_quanity: {
            type: 'any-of',
            contains: [{
                type: 'number',
            }, {
                type: 'null',
            }],
        },
        st_erp_production_department: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        st_erp_production_line: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
    },
} as const;
