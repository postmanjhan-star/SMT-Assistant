/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $FujiMounterFileRead = {
    properties: {
        id: {
            type: 'number',
            isRequired: true,
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
            type: 'any-of',
            contains: [{
                type: 'string',
                format: 'date-time',
            }, {
                type: 'null',
            }],
            isRequired: true,
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
            type: 'string',
            isRequired: true,
        },
        fuji_mounter_file_items: {
            type: 'array',
            contains: {
                type: 'FujiMounterFileItemRead',
            },
            isRequired: true,
        },
    },
} as const;
