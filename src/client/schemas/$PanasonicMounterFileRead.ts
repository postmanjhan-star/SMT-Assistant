/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $PanasonicMounterFileRead = {
    properties: {
        id: {
    type: 'number',
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
    type: 'string',
},
        panasonic_mounter_file_items: {
    type: 'array',
    contains: {
        type: 'PanasonicMounterFileItemRead',
    },
},
    },
} as const;
