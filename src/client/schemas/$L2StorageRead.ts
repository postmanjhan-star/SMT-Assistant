/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $L2StorageRead = {
    properties: {
        id: {
            type: 'number',
            isRequired: true,
        },
        idno: {
            type: 'string',
            isRequired: true,
        },
        name: {
            type: 'string',
            isRequired: true,
        },
        seastone_smart_rack_cell: {
            type: 'any-of',
            contains: [{
                type: 'SeastoneSmartRackCellRead',
            }, {
                type: 'null',
            }],
        },
    },
} as const;
