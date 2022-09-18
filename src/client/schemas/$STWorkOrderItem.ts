/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $STWorkOrderItem = {
    properties: {
        word_order_idno: {
            type: 'string',
            isRequired: true,
        },
        part_idno: {
            type: 'string',
            isRequired: true,
        },
        side_in_smt_mounter: {
            type: 'string',
            isRequired: true,
        },
        slot_in_smt_mounter: {
            type: 'number',
            isRequired: true,
        },
    },
} as const;
