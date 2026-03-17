/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $PanasonicMounterFileRead = {
    properties: {
        id: {
            type: 'any-of',
            contains: [{
                type: 'number',
            }, {
                type: 'null',
            }],
        },
        file_name: {
            type: 'string',
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
        product_idno: {
            type: 'string',
            isRequired: true,
        },
        product_ver: {
            type: 'string',
            isRequired: true,
        },
        mounter_idno: {
            type: 'string',
            isRequired: true,
        },
        board_side: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        panasonic_mounter_file_items: {
            type: 'any-of',
            contains: [{
                type: 'array',
                contains: {
                    type: 'PanasonicMounterFileItemRead',
                },
            }, {
                type: 'null',
            }],
        },
    },
} as const;
