/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $PanasonicMounterItemStatCreate = {
    properties: {
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
        production_start: {
    type: 'string',
    isRequired: true,
    format: 'date-time',
},
        production_end: {
    type: 'any-of',
    contains: [{
    type: 'string',
    format: 'date-time',
}, {
    type: 'null',
}],
},
        work_order_no: {
    type: 'any-of',
    contains: [{
    type: 'string',
}, {
    type: 'null',
}],
    isRequired: true,
},
        product_idno: {
    type: 'string',
    isRequired: true,
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
},
        board_side: {
    type: 'any-of',
    contains: [{
    type: 'BoardSideEnum',
}, {
    type: 'null',
}],
},
        slot_idno: {
    type: 'string',
    isRequired: true,
},
        sub_slot_idno: {
    type: 'any-of',
    contains: [{
    type: 'string',
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
    type: 'any-of',
    contains: [{
    type: 'string',
}, {
    type: 'null',
}],
    isRequired: true,
},
        produce_mode: {
    type: 'any-of',
    contains: [{
    type: 'ProduceTypeEnum',
}, {
    type: 'null',
}],
    isRequired: true,
},
        operation_type: {
    type: 'MaterialOperationTypeEnum',
},
        feed_material_pack_type: {
    type: 'any-of',
    contains: [{
    type: 'FeedMaterialTypeEnum',
}, {
    type: 'null',
}],
},
        unfeed_material_pack_type: {
    type: 'any-of',
    contains: [{
    type: 'UnfeedMaterialTypeEnum',
}, {
    type: 'null',
}],
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
