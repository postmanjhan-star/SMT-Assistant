/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $IssuanceReturnCreate = {
    properties: {
        material_inventory_idno: {
            type: 'string',
            isRequired: true,
        },
        return_quantity: {
            type: 'any-of',
            contains: [{
                type: 'number',
            }, {
                type: 'string',
            }],
            isRequired: true,
        },
    },
} as const;
