/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $SmtMounterFstRead = {
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
        smt_mounter_fst_items: {
    type: 'array',
    contains: {
        type: 'SmtMounterFstItemRead',
    },
    isRequired: true,
},
    },
} as const;
