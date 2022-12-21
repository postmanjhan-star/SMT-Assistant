<script setup lang="ts">
import panasonicCsvExportOptions from '@/assets/panasonic_csv_export_options.png';
import { NButton, NCard, NGi, NGrid, NModal, NP, NSpace, NText, NUpload, NUploadDragger, UploadFileInfo, useMessage } from 'naive-ui';
import { FileInfo, UploadInst } from 'naive-ui/es/upload/src/interface';
import { ref } from 'vue';
import { useMeta } from 'vue-meta';

useMeta( { title: 'Panasonic Mounter Assistant' } );

const message = useMessage()

const uploadUrl = '/api/smt/panasonic_mounter/upload_csv';
const uploadRef = ref<UploadInst | null>( null )
const disableUploadButton = ref( true )

const showModal = ref( false )

function onFileListChange ( options: { fileList: UploadFileInfo[] } ) { disableUploadButton.value = options.fileList.length > 0 ? false : true }


function onBeforeUpload ( data: { file: Required<FileInfo>, fileList: Required<FileInfo>[] } ) {
  if ( data.file.file?.type !== 'text/csv' ) {
    message.error( '只能上傳 CSV 格式的文件' )
    return false
  }
  return true
}

function onClickUploadButton ( event: Event ) { uploadRef.value?.submit() }


function onUploadFinish ( { file, event }: { file: UploadFileInfo, event?: ProgressEvent } ) {
  message.success( `${ file.name } 上傳成功` )
  uploadRef.value.clear()
}


function onUploadError ( { file, event }: { file: UploadFileInfo, event?: ProgressEvent } ) {
  message.error( `${ file.name } 上傳失敗`, { keepAliveOnHover: true } )
  uploadRef.value.clear()
}
</script>



<template>
  <div style="padding: 1rem;">

    <n-space vertical size="large" style="padding: 1rem;">
      <n-grid cols="1 s:3" responsive="screen" y-gap="20">

        <n-gi></n-gi>
        <n-gi>
          <n-space vertical size="large">

            <n-upload accept=".csv" :multiple=" false " :default-upload=" false " :action=" uploadUrl " :max=" 1 "
              @before-upload=" onBeforeUpload( $event ) " @change=" onFileListChange( $event ) " ref="uploadRef"
              @finish=" onUploadFinish " :show-cancel-butto=" false " @error=" onUploadError ">
              <n-upload-dragger>
                <n-p style="font-size: xxx-large">📄</n-p>
                <n-text>點擊或者拖動 Panasonic 打件機 CSV 文件</n-text>
              </n-upload-dragger>
            </n-upload>

            <n-button block size="large" type="primary" @click=" onClickUploadButton( $event ) "
              :disabled=" disableUploadButton ">上傳</n-button>

            <n-button block size="large" @click=" showModal = true ">CSV 輸出說明</n-button>

          </n-space>

        </n-gi>
        <n-gi></n-gi>

      </n-grid>
    </n-space>
  </div>
  <n-modal v-model:show=" showModal " preset="card" style="width: 800px; max-width: 80vw;">
    <n-card role="dialog" aria-modal="true" size="huge" :bordered=" false ">
      <template #cover>
        <img :src=" panasonicCsvExportOptions ">
      </template>
    </n-card>
  </n-modal>
</template>
