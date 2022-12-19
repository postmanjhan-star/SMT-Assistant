<script setup lang="ts">
import { NA, NBreadcrumb, NBreadcrumbItem, NButton, NForm, NFormItemGi, NGrid, NH1, NInput, NSpace, NTabPane, NTabs } from 'naive-ui'
import { onBeforeMount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, OpenAPI, SeastoneService, SeastoneSmartRackReadWithChildren } from '../../client/index'
import { useAuthStore } from '../../stores/auth'
import SeastoneRackCellsMaster from "./SeastoneRackCellsMaster.vue"

const authStore = useAuthStore()
OpenAPI.TOKEN = JSON.parse( authStore.accountToken )[ 'access_token' ]

const router = useRouter()
const route = useRoute()

const formValue = ref<SeastoneSmartRackReadWithChildren>( {
  id: 0,
  rack_idno: '',
  server_address: '',
  wifi_ip: '',
  wifi_mac: '',
  eth_ip: '',
  eth_mac: '',
  dev_id: '',
} );

let tabDefaultValue: string
switch ( route.query[ 'tab' ] ) {
  case 'properties':
    tabDefaultValue = 'properties'
    break
  case 'cells':
    tabDefaultValue = 'cells'
    break
  default:
    tabDefaultValue = 'properties'
    break
}

onBeforeMount( async () => {
  try { formValue.value = await SeastoneService.getSeastoneSmartRack( { rackIdno: route.params.rack_idno.toString() } ) }
  catch ( error ) { if ( error instanceof ApiError && error.status === 404 ) { router.push( '/http-status/404' ) } }
} )



function onClickEditButton ( event: Event ) { router.push( `/wms/seastone_racks/${ route.params.rack_idno.toString() }/edit` ) }
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
      <n-breadcrumb-item>系統管理</n-breadcrumb-item>
      <n-breadcrumb-item>
        <router-link to="/wms/seastone_racks" #=" { navigate, href } " custom>
          <n-a :href=" href " @click=" navigate ">智慧料架管理</n-a>
        </router-link>
      </n-breadcrumb-item>
      <n-breadcrumb-item>{{ $route.params.rack_idno.toString().toUpperCase() }}</n-breadcrumb-item>
    </n-breadcrumb>

    <div style="padding: 1rem;">
      <n-h1 prefix="bar" style="font-size: 1.4rem;" id="heading1">{{ $route.params.rack_idno.toString().toUpperCase()
      }}</n-h1>

      <n-space vertical size="large"
        style="background-color: white; padding: 1rem; box-shadow: 0px 4px 20px -4px hsla(0, 0%, 60%, 0.4)">

        <n-tabs type="line" size="large" :default-value=" tabDefaultValue ">

          <n-tab-pane name="properties" tab="基本屬性" display-directive="show:lazy">

            <n-space size="large" style="margin-bottom: 1rem;">
              <n-button @click=" onClickEditButton( $event ) " attr-type="button">編輯</n-button>
            </n-space>

            <n-form size="large" :model=" formValue ">
              <n-grid cols="1 s:2" responsive="screen" x-gap="20">

                <n-form-item-gi label="服務主機位址">
                  <n-input v-model:value.lazy=" formValue.server_address " readonly
                    :input-props=" { id: 'server_address' } "></n-input>
                </n-form-item-gi>

                <n-form-item-gi label="料架代碼">
                  <n-input v-model:value.lazy=" formValue.rack_idno " readonly
                    :input-props=" { id: 'rack_idno' } "></n-input>
                </n-form-item-gi>

                <n-form-item-gi label="Wi-Fi IP 位址">
                  <n-input v-model:value.lazy=" formValue.wifi_ip " readonly
                    :input-props=" { id: 'wifi_ip' } "></n-input>
                </n-form-item-gi>

                <n-form-item-gi label="Wi-Fi MAC 位址">
                  <n-input v-model:value.lazy=" formValue.wifi_mac " readonly
                    :input-props=" { id: 'wifi_mac' } "></n-input>
                </n-form-item-gi>

                <n-form-item-gi label="有線 IP 位址">
                  <n-input v-model:value.lazy=" formValue.eth_ip " readonly :input-props=" { id: 'eth_ip' } "></n-input>
                </n-form-item-gi>

                <n-form-item-gi label="有線 MAC 位址">
                  <n-input v-model:value.lazy=" formValue.eth_mac " readonly
                    :input-props=" { id: 'eth_mac' } "></n-input>
                </n-form-item-gi>

                <n-form-item-gi label="料架序號">
                  <n-input v-model:value.lazy=" formValue.dev_id " readonly :input-props=" { id: 'dev_id' } "></n-input>
                </n-form-item-gi>

              </n-grid>
            </n-form>
          </n-tab-pane>

          <n-tab-pane name="cells" tab="槽位管理" display-directive="show:lazy">
            <seastone-rack-cells-master></seastone-rack-cells-master>
          </n-tab-pane>

        </n-tabs>

      </n-space>
    </div>
  </main>
</template>



<style>
main {
  background-image: url("/pattern.svg");
}
</style>
