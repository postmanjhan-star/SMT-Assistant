/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $FujiFeedRecordCreate = {
    properties: {
        stat_item_id: {
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
        slot_idno: {
            type: 'string',
            isRequired: true,
        },
        sub_slot_idno: {
            type: 'string',
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
        unfeed_reason: {
            type: 'any-of',
            contains: [{
                type: 'UnfeedReasonEnum',
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
