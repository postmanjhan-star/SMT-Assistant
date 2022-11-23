<script setup lang="ts">
import { NGi, NGrid, NP, NSpace, NUpload, NUploadDragger } from 'naive-ui';
import { useMeta } from 'vue-meta';


useMeta( { title: 'Panasonic Mounter Assistant' } );

const uploadUrl = '/api/smt/panasonic_mounter/upload_csv';
</script>



<template>
  <div style="padding: 1rem;">

    <n-space vertical size="large" style="padding: 1rem;">
      <n-grid cols="1 s:3" responsive="screen" y-gap="20">

        <n-gi></n-gi>
        <n-gi>
          <n-upload accept=".csv" :multiple="false" :action=uploadUrl>
            <n-upload-dragger>
              <n-p style="font-size: xx-large">📄</n-p>
              <n-p>點擊或者拖動 Panasonic 打件機 CSV 文件到該區域來上傳</n-p>
            </n-upload-dragger>
          </n-upload>
        </n-gi>
        <n-gi></n-gi>

      </n-grid>

    </n-space>
  </div>
</template>
