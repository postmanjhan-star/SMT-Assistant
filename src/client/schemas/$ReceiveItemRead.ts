/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ReceiveItemRead = {
    properties: {
        id: {
            type: 'number',
            isRequired: true,
        },
        receive_id: {
            type: 'number',
            isRequired: true,
        },
        material_id: {
            type: 'number',
            isRequired: true,
        },
        material_idno: {
            type: 'string',
            isRequired: true,
        },
        total_qty: {
            type: 'string',
            isRequired: true,
        },
        qualify_qty: {
            type: 'string',
            isRequired: true,
        },
        purchase_idno: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
            isRequired: true,
        },
        st_receive_idno: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
            isRequired: true,
        },
    },
} as const;
