/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $STWorkOrder = {
    properties: {
        idno: {
            type: 'string',
            isRequired: true,
        },
        issue_date: {
            type: 'string',
            isRequired: true,
            format: 'date',
        },
        work_order_items: {
            type: 'array',
            contains: {
                type: 'STWorkOrderItem',
            },
        },
    },
} as const;
