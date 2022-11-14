/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $PanasonicMounterFileRead = {
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
        panasonic_mounter_file_items: {
    type: 'array',
    contains: {
        type: 'PanasonicMounterFileItemRead',
    },
    isRequired: true,
},
    },
} as const;
