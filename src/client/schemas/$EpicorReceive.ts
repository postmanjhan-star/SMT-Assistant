/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EpicorReceive = {
    properties: {
        SysRevID: {
    type: 'number',
    isRequired: true,
},
        VendorNum: {
    type: 'number',
    isRequired: true,
},
        ReceiptDate: {
    type: 'string',
    isRequired: true,
    format: 'date-time',
},
        PackSlip: {
    type: 'string',
    isRequired: true,
},
        PONum: {
    type: 'string',
    isRequired: true,
},
        VendorNumName: {
    type: 'string',
    isRequired: true,
},
        ReceiveDetails: {
    type: 'any-of',
    contains: [{
    type: 'array',
    contains: {
        type: 'EpicorReceiveDetail',
    },
}, {
    type: 'null',
}],
    isRequired: true,
},
    },
} as const;
