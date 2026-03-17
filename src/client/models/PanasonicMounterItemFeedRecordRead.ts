/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { CheckMaterialMatchEnum } from './CheckMaterialMatchEnum';
import type { FeedMaterialTypeEnum } from './FeedMaterialTypeEnum';
import type { MaterialOperationTypeEnum } from './MaterialOperationTypeEnum';
import type { UnfeedMaterialTypeEnum } from './UnfeedMaterialTypeEnum';
import type { UnfeedReasonEnum } from './UnfeedReasonEnum';

export type PanasonicMounterItemFeedRecordRead = {
    operator_id: (string | null);
    operation_time: string;
    material_pack_code: (string | null);
    operation_type: MaterialOperationTypeEnum;
    feed_material_pack_type: (FeedMaterialTypeEnum | null);
    unfeed_material_pack_type: (UnfeedMaterialTypeEnum | null);
    unfeed_reason: (UnfeedReasonEnum | null);
    check_pack_code_match: (CheckMaterialMatchEnum | null);
};

