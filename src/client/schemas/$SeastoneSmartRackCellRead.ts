/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $SeastoneSmartRackCellRead = {
    properties: {
        id: {
    type: 'number',
    isRequired: true,
},
        seastone_smart_rack_id: {
    type: 'number',
    isRequired: true,
},
        cell_idno: {
    type: 'string',
    isRequired: true,
},
        side: {
    type: 'number',
    isRequired: true,
},
    },
} as const;
