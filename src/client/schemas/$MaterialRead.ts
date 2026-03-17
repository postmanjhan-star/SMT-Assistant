/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MaterialRead = {
    properties: {
        id: {
            type: 'number',
            isRequired: true,
        },
        idno: {
            type: 'string',
            isRequired: true,
        },
        material_type: {
            type: 'MaterialTypeEnum',
            isRequired: true,
        },
        name: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
            isRequired: true,
        },
        description: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
            isRequired: true,
        },
        unit: {
            type: 'UnitEnum',
            isRequired: true,
        },
        qty_per_pack: {
            type: 'string',
            isRequired: true,
        },
        expiry_days: {
            type: 'number',
            isRequired: true,
        },
    },
} as const;
