/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $STWorkOrder = {
    properties: {
        work_order_idno: {
    type: 'string',
    isRequired: true,
},
        product_idno: {
    type: 'string',
    isRequired: true,
},
        issue_date: {
    type: 'string',
    isRequired: true,
    format: 'date',
},
        due_date: {
    type: 'string',
    isRequired: true,
    format: 'date',
},
        quantity: {
    type: 'number',
    isRequired: true,
},
        production_department: {
    type: 'string',
    isRequired: true,
},
        production_line: {
    type: 'string',
    isRequired: true,
},
        work_order_items: {
    type: 'array',
    contains: {
        type: 'STWorkOrderItem',
    },
},
    },
} as const;
