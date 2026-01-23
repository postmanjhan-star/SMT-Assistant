/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $FujiMounterItemStatRead = {
    properties: {
        id: {
    type: 'number',
    isRequired: true,
},
        uuid: {
    type: 'string',
    isRequired: true,
},
        created_at: {
    type: 'string',
    isRequired: true,
    format: 'date-time',
},
        updated_at: {
    type: 'any-of',
    contains: [{
    type: 'string',
    format: 'date-time',
}, {
    type: 'null',
}],
    isRequired: true,
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
    isRequired: true,
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
        slot_idno: {
    type: 'string',
    isRequired: true,
},
        sub_slot_idno: {
    type: 'string',
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
        produce_mode: {
    type: 'any-of',
    contains: [{
    type: 'ProduceTypeEnum',
}, {
    type: 'null',
}],
    isRequired: true,
},
    },
} as const;
