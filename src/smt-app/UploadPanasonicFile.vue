<script setup lang="ts">
import panasonicCsvExportOptions from '@/assets/panasonic_csv_export_options.png'
import { FormInst, FormRules, NButton, NCard, NForm, NFormItem, NGi, NGrid, NInput, NModal, NP, NSpace, NText, NUpload, NUploadDragger, UploadFileInfo, useMessage } from 'naive-ui'
import { FileInfo, UploadInst } from 'naive-ui/es/upload/src/interface'
import { ref } from 'vue'
import { useMeta } from 'vue-meta'
import { Body_upload_panasonic_mounter_csv } from '../client'

useMeta( { title: 'Panasonic Mounter Assistant' } );

const message = useMessage()

const formValue = ref<Body_upload_panasonic_mounter_csv>( { file: null, product_ver: null } )

const uploadUrl = '/api/smt/panasonic_mounter/upload_csv';
const uploadRef = ref<UploadInst | null>( null )
const disableUploadButton = ref( true )

const showModal = ref( false )

const formRef = ref<FormInst | null>( null )
const rules: FormRules = { product_ver: { required: true, message: '請輸入版次', trigger: [ 'blur' ], } }

function onFileListChange ( options: { fileList: UploadFileInfo[] } ) { disableUploadButton.value = options.fileList.length > 0 ? false : true }


function onBeforeUpload ( data: { file: Required<FileInfo>, fileList: Required<FileInfo>[] } ) {
  if ( data.file.file?.type !== 'text/csv' ) {
    message.error( '只能上傳 CSV 格式的文件' )
    return false
  }
  return true
}

function onClickUploadButton ( event: Event ) {
  console.debug( formValue.value.product_ver )
  // uploadRef.value?.submit()
}


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
          <n-form size="large" :model=" formValue " :rules=" rules " ref="formRef">

            <n-form-item :show-label=" false ">
              <n-upload accept=".csv" :multiple=" false " :default-upload=" false " :action=" uploadUrl " :max=" 1 "
                @before-upload=" onBeforeUpload( $event ) " @change=" onFileListChange( $event ) " ref="uploadRef"
                @finish=" onUploadFinish " :show-cancel-butto=" false " @error=" onUploadError ">
                <n-upload-dragger>
                  <n-p style="font-size: xxx-large">📄</n-p>
                  <n-text>點擊或者拖動 Panasonic 打件機 CSV 文件</n-text>
                </n-upload-dragger>
              </n-upload>
            </n-form-item>

            <n-form-item show-require-mark label="成品物料版次" path="product_ver">
              <n-input type="text" v-model:value.lazy=" formValue.product_ver "
                :input-props=" { id: 'product_ver' } " />
            </n-form-item>

            <n-form-item :show-label=" false ">
              <n-button block type="primary" @click=" onClickUploadButton( $event ) " attr-type="submit"
                :disabled=" disableUploadButton ">上傳</n-button>
            </n-form-item>

            <n-form-item :show-label=" false ">
              <n-button block @click=" showModal = true ">CSV 輸出說明</n-button>
            </n-form-item>

          </n-form>
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
