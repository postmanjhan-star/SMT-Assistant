/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $IssuanceRead = {
    properties: {
        id: {
            type: 'number',
            isRequired: true,
        },
        idno: {
            type: 'string',
            isRequired: true,
        },
        date: {
            type: 'string',
            isRequired: true,
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
        issuance_items: {
            type: 'array',
            contains: {
                type: 'IssuanceItemRead',
            },
        },
    },
} as const;