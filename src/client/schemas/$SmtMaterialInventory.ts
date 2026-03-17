/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $SmtMaterialInventory = {
    properties: {
        id: {
            type: 'any-of',
            contains: [{
                type: 'number',
            }, {
                type: 'null',
            }],
        },
        idno: {
            type: 'string',
            isRequired: true,
        },
        material_id: {
            type: 'any-of',
            contains: [{
                type: 'number',
            }, {
                type: 'null',
            }],
            isRequired: true,
        },
        material_idno: {
            type: 'string',
            isRequired: true,
        },
        material_name: {
            type: 'string',
            isRequired: true,
        },
    },
} as const;
