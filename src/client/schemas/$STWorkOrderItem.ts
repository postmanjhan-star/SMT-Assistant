/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $STWorkOrderItem = {
    properties: {
        work_order_idno: {
    type: 'string',
    description: `工單號`,
    isRequired: true,
},
        material_id: {
    type: 'number',
    isRequired: true,
},
        material_idno: {
    type: 'string',
    description: `物料編號`,
    isRequired: true,
},
        material_inventory_id: {
    type: 'number',
    isRequired: true,
},
        material_inventory_idno: {
    type: 'string',
    description: `WMS 單包代碼`,
    isRequired: true,
},
        material_inventory_st_barcode: {
    type: 'string',
    description: `舊 ERP 單包代碼`,
    isRequired: true,
},
        side_in_smt_mounter: {
    type: 'string',
    description: `材料於打件機上件面向`,
    isRequired: true,
},
        slot_in_smt_mounter: {
    type: 'number',
    description: `材料於打件機上件槽位`,
    isRequired: true,
},
    },
} as const;
