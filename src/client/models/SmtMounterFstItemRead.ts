/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type SmtMounterFstItemRead = {
    id: number;
    smt_mounter_fst_id: number;
    stage: string;
    slot: number;
    original: string;
    alt_slot: number;
    part_number: string;
    feeder_name: string;
    feed_count: number;
    skip: boolean;
    status: string;
    tray_direction: number;
};
