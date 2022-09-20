/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $STWorkOrder = {
    properties: {
        idno: {
    type: 'string',
    description: `工單號`,
    isRequired: true,
},
        issue_date: {
    type: 'string',
    description: `工單發行日期`,
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
