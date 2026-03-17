/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $WorkflowSummaryMounterRead = {
    properties: {
        work_order_idno: {
            type: 'string',
            isRequired: true,
        },
        product_idno: {
            type: 'string',
            isRequired: true,
        },
        machine_idno: {
            type: 'string',
            isRequired: true,
        },
        produce_mode: {
            type: 'ProduceTypeEnum',
            isRequired: true,
        },
    },
} as const;
