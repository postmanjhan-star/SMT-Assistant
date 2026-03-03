/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $PanasonicItemStatFeedLogRead = {
    properties: {
        id: {
    type: 'number',
    isRequired: true,
},
        created_at: {
    type: 'string',
    isRequired: true,
    format: 'date-time',
},
        feed_record_id: {
    type: 'number',
    isRequired: true,
},
        operator_id: {
    type: 'any-of',
    contains: [{
    type: 'string',
}, {
    type: 'null',
}],
    isRequired: true,
},
        operation_time: {
    type: 'string',
    isRequired: true,
    format: 'date-time',
},
        machine_idno: {
    type: 'string',
    isRequired: true,
},
        machine_side: {
    type: 'any-of',
    contains: [{
    type: 'MachineSideEnum',
}, {
    type: 'null',
}],
    isRequired: true,
},
        board_side: {
    type: 'any-of',
    contains: [{
    type: 'BoardSideEnum',
}, {
    type: 'null',
}],
    isRequired: true,
},
        material_idno: {
    type: 'any-of',
    contains: [{
    type: 'string',
}, {
    type: 'null',
}],
    isRequired: true,
},
        material_pack_code: {
    type: 'string',
    isRequired: true,
},
        operation_type: {
    type: 'MaterialOperationTypeEnum',
    isRequired: true,
},
        feed_material_pack_type: {
    type: 'any-of',
    contains: [{
    type: 'FeedMaterialTypeEnum',
}, {
    type: 'null',
}],
    isRequired: true,
},
        unfeed_material_pack_type: {
    type: 'any-of',
    contains: [{
    type: 'UnfeedMaterialTypeEnum',
}, {
    type: 'null',
}],
    isRequired: true,
},
        unfeed_reason: {
    type: 'any-of',
    contains: [{
    type: 'UnfeedReasonEnum',
}, {
    type: 'null',
}],
    isRequired: true,
},
        slot_idno: {
    type: 'string',
    isRequired: true,
},
        sub_slot_idno: {
    type: 'string',
    isRequired: true,
},
        stat_uuid: {
    type: 'string',
    isRequired: true,
},
        produce_mode: {
    type: 'ProduceTypeEnum',
    isRequired: true,
},
        check_pack_code_match: {
    type: 'any-of',
    contains: [{
    type: 'CheckMaterialMatchEnum',
}, {
    type: 'null',
}],
    isRequired: true,
},
    },
} as const;
