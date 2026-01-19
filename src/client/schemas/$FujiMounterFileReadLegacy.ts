/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $FujiMounterFileReadLegacy = {
    properties: {
        id: {
    type: 'number',
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
        type: 'FujiMounterFileItemReadLegacy',
    },
    isRequired: true,
},
    },
} as const;
