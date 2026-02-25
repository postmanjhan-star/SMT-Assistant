/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $PanasonicMounterItemFeedRecordRead = {
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
        material_pack_code: {
    type: 'any-of',
    contains: [{
    type: 'string',
}, {
    type: 'null',
}],
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
