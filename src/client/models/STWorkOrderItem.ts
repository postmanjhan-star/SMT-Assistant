/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type STWorkOrderItem = {
    /**
     * 工單號
     */
    work_order_idno: string;
    material_id: number;
    /**
     * 物料編號
     */
    material_idno: string;
    material_inventory_id: number;
    /**
     * WMS 單包代碼
     */
    material_inventory_idno: string;
    /**
     * 舊 ERP 單包代碼
     */
    material_inventory_st_barcode: string;
    /**
     * 材料於打件機上件面向
     */
    side_in_smt_mounter: string;
    /**
     * 材料於打件機上件槽位
     */
    slot_in_smt_mounter: number;
};
