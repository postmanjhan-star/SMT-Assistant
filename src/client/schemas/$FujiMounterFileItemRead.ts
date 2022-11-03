/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $FujiMounterFileItemRead = {
    properties: {
        id: {
    type: 'number',
    isRequired: true,
},
        smt_mounter_fst_id: {
    type: 'number',
    isRequired: true,
},
        stage: {
    type: 'string',
    isRequired: true,
},
        slot: {
    type: 'number',
    isRequired: true,
},
        original: {
    type: 'string',
    isRequired: true,
},
        alt_slot: {
    type: 'number',
    isRequired: true,
},
        part_number: {
    type: 'string',
    isRequired: true,
},
        feeder_name: {
    type: 'string',
    isRequired: true,
},
        feed_count: {
    type: 'number',
    isRequired: true,
},
        skip: {
    type: 'boolean',
    isRequired: true,
},
        status: {
    type: 'string',
    isRequired: true,
},
        tray_direction: {
    type: 'number',
    isRequired: true,
},
    },
} as const;
