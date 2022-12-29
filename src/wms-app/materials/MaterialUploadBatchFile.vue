<script setup lang="ts">
import { NA, NBreadcrumb, NBreadcrumbItem, NButton, NGi, NGrid, NH1, NH2, NLi, NP, NSpace, NText, NUl, NUpload, NUploadDragger, UploadCustomRequestOptions, UploadFileInfo, useMessage } from 'naive-ui'
import { FileInfo, UploadInst } from 'naive-ui/es/upload/src/interface'
import { ref } from 'vue'
import { useMeta } from 'vue-meta'
import { ApiError, MaterialsService, OpenAPI } from '../../client'
import { useAuthStore } from '../../stores/auth'

useMeta( { title: 'Panasonic Mounter Assistant' } );

const authStore = useAuthStore();
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ];

const message = useMessage()

const uploadUrl = '/api/materials/upload_material_batch_file';
const uploadRef = ref<UploadInst | null>( null )

const disableUploadButton = ref( true )

function onFileListChange ( options: { fileList: UploadFileInfo[] } ) {
  disableUploadButton.value = options.fileList.length > 0 ? false : true
}


function onBeforeUpload ( data: { file: Required<FileInfo>, fileList: Required<FileInfo>[] } ) {
  if ( data.file.file?.type !== 'application/vnd.oasis.opendocument.spreadsheet' && data.file.file?.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ) {
    message.error( '只吃 ods / xlsx 文件' )
    return false
  }
  return true
}

function onClickUploadButton ( event: Event ) { uploadRef.value?.submit() }

async function customRequest (
  { file, data, headers, withCredentials, action, onFinish, onError, onProgress }: UploadCustomRequestOptions
) {
  console.debug( file )
  try {
    await MaterialsService.uploadMaterialBatchFile( { formData: { file: file.file } } )
    message.success( `${ file.name } 上傳成功` )
    uploadRef.value?.clear()
    onFinish()
  } catch ( error ) {
    // console.error( error )
    if ( error instanceof ApiError && error.status === 409 ) {
      message.error( `物料有重複，上傳失敗`, { keepAliveOnHover: true } )
    } else {
      message.error( `${ file.name } 上傳失敗`, { keepAliveOnHover: true } )
    }
    uploadRef.value?.clear()
    onError()
  } finally { disableUploadButton.value = true }
}
</script>



<template>
  <main
    style="min-height: calc(100vh - 60px); background-color: hsla(0, 0%, 92%, 1.0); background-repeat: repeat-x; background-position: center; background-size: cover;">

    <n-breadcrumb
      style="padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4); position: relative; background-color: white; z-index: 1; overflow: auto;">
      <n-breadcrumb-item>
        <router-link to="/wms/home" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">首頁</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>基本資料管理</n-breadcrumb-item>
      <n-breadcrumb-item>
        <router-link to="/wms/materials" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">物料管理</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>批次建立物料</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;">批次建立物料</n-h1>

      <n-space vertical size="large"
        style="padding: 1rem; background-color: white; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-grid cols="1 s:3" responsive="screen" y-gap="20">

          <n-gi></n-gi>
          <n-gi>
            <n-space vertical size="large">

              <n-upload accept=".ods, .xlsx" :multiple=" false " :default-upload=" false " :action=" uploadUrl "
                :custom-request=" customRequest " :max=" 1 " @before-upload=" onBeforeUpload( $event ) "
                @change=" onFileListChange( $event ) " ref="uploadRef" :show-cancel-butto=" false ">
                <n-upload-dragger>
                  <n-p style="font-size: xxx-large">📄</n-p>
                  <n-p style="font-size: large"><n-text strong>ods</n-text> / <n-text strong>xlsx</n-text></n-p>
                  <n-text>開啟物料建立批次檔</n-text>
                </n-upload-dragger>
              </n-upload>

              <n-button block size="large" type="primary" @click=" onClickUploadButton( $event ) "
                :disabled=" disableUploadButton ">上傳</n-button>

              <n-grid cols="2" responsive="screen" x-gap="20" y-gap="20">
                <n-gi>
                  <n-button block size="large">
                    <a href="/api/static/material_create_template_1.0.ods"
                      style="text-decoration: none; color: unset;">下載空白 ods 模板檔</a>
                  </n-button>
                </n-gi>
                <n-gi>
                  <n-button block size="large" @click="">
                    <a href="/api/static/material_create_template_1.0.xlsx"
                      style="text-decoration: none; color: unset;">下載空白 xlsx 模板檔</a>
                  </n-button>
                </n-gi>
              </n-grid>

              <div style="margin-top: 1rem;">
                <n-ul>
                  <n-li>批次新建功能僅用於「新建」，如果檔案內之物料代碼與系統重複，將會報錯。</n-li>
                  <n-li>請愛惜使用。</n-li>
                  <n-li>請注意第三點。</n-li>
                </n-ul>
              </div>
            </n-space>

          </n-gi>
          <n-gi></n-gi>

        </n-grid>
      </n-space>
    </div>
  </main>
</template>



<style>
main {
  background-image: url('/pattern.svg');
}
</style>
