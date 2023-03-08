<script setup lang="ts">
import { format, set, subHours, subMinutes } from 'date-fns'
import { darkTheme, NA, NCard, NConfigProvider, NEl, NGi, NGrid, NSpace, NSpin, useMessage } from 'naive-ui'
import Plotly from 'plotly.js-dist-min'
import locale from 'plotly.js-locales/zh-tw'
import { computed, onMounted, ref } from 'vue'

const message = useMessage();

const loading = ref<boolean>( true )

type backendDataTypeForHour = {
  I1: number, // Humidity
  I2: number,
  I3: number,
  V1: number, // Temperature
  V2: number,
  V3: number,
  count: number,
  sum: number,
  NNS: string, // Minute.
  time: string, // Ignore thie field. It is always "1970-01-01T00:00:00Z".
}

type backendDataTypeForMinute = {
  I1: number, // Humidity
  I2: number,
  I3: number,
  V1: number, // Temperature
  V2: number,
  V3: number,
  count: number,
  sum: number,
  time: string,
}

const plotX = ref<[ Date | null ]>( [ null ] )
const plotTemperatureY = ref<[ number | null ]>( [ null ] )
const plotHumidityY = ref<[ number | null ]>( [ null ] )

const latestTemperature = computed( () => { return plotTemperatureY.value[ plotTemperatureY.value.length - 1 ] || 0 } )
const latestHumidity = computed( () => { return plotHumidityY.value[ plotHumidityY.value.length - 1 ] || 0 } )

const clockTime = ref<Date>( new Date() )
setInterval( () => { clockTime.value = new Date() }, 1000 )
setInterval( fetchSepdificMinutePlotData, 1000 * 60 )

const plotlyData: Plotly.Data[] = [
  {
    type: 'scatter',
    mode: 'lines',
    name: '溫度',
    connectgaps: true,
    x: plotX.value,
    y: plotTemperatureY.value,
    yaxis: 'y1',
    line: { width: 2, shape: 'spline', smoothing: 1 },
  },
  {
    type: 'scatter',
    mode: 'lines',
    name: '濕度',
    connectgaps: true,
    x: plotX.value,
    y: plotHumidityY.value,
    yaxis: 'y2',
    line: { width: 2, shape: 'spline', smoothing: 1 },
  },
]

const plotlyLayout: Partial<Plotly.Layout> = {
  autosize: true,
  margin: { t: 0, l: 0, r: 0, b: 0 },
  showlegend: false,
  xaxis: {
    type: 'date',
    color: 'hsla(0, 0%, 72%, 1)',
    automargin: true,
    autorange: true,
    autotick: true,
  },
  yaxis: {
    title: { text: 'Temperature', standoff: 20, font: { color: 'hsla(0, 0%, 72%, 1)' } },
    color: 'hsla(0, 0%, 72%, 1)',
    gridcolor: 'hsla(0, 0%, 92%, 1)',
    automargin: true,
    autotick: true,
    range: [ 21 - 0.2, 25 + 0.2 ],
  },
  yaxis2: {
    title: { text: 'Humidity', standoff: 20, font: { color: 'hsla(0, 0%, 72%, 1)' } },
    color: 'hsla(0, 0%, 72%, 1)',
    gridcolor: 'hsla(0, 0%, 92%, 1)',
    automargin: true,
    autotick: true,
    range: [ 40 - 1, 60 + 1 ],
  },
  grid: { rows: 2, columns: 1, pattern: 'coupled' },
  shapes: [
    { xref: 'paper', type: 'line', x0: 0, x1: 1, y0: 23, y1: 23, line: { color: 'lightblue' } },
    { xref: 'paper', type: 'rect', x0: 0, x1: 1, y0: Number.MIN_SAFE_INTEGER, y1: 21, fillcolor: 'red', opacity: 0.1, line: { width: 0 }, },
    { xref: 'paper', type: 'rect', x0: 0, x1: 1, y0: 25, y1: Number.MAX_SAFE_INTEGER, fillcolor: 'red', opacity: 0.1, line: { width: 0 }, },

    { yref: 'y2', xref: 'paper', type: 'line', x0: 0, x1: 1, y0: 50, y1: 50, line: { color: 'lightblue' } },
    { yref: 'y2', xref: 'paper', type: 'rect', x0: 0, x1: 1, y0: 0, y1: 40, fillcolor: 'red', opacity: 0.1, line: { width: 0 }, },
    { yref: 'y2', xref: 'paper', type: 'rect', x0: 0, x1: 1, y0: 60, y1: 100, fillcolor: 'red', opacity: 0.1, line: { width: 0 }, },
  ],
}

const plotlyConfig: Partial<Plotly.Config> = {
  toImageButtonOptions: { format: 'webp' },
  locale: 'zh-TW',
  responsive: true,
  displayModeBar: false,
}

async function fetchSpecificHourPlotData ( dateTime: Date, hour: number ) {
  let response: Response
  try {
    response = await fetch(
      'http://200.0.0.112:5001/ems/getTHforDate.php',
      {
        method: 'POST',
        body: JSON.stringify( { device: 'E064', queryDate: format( dateTime, 'yyyy-MM-dd' ), HHS: hour } ),
      },
    )
  } catch ( error ) {
    console.error( error )
    message.error( '讀取後端資料失敗' )
    return false
  }

  const response_json: [ backendDataTypeForHour ] = await response.json()
  // console.debug( response_json )
  for ( let data of response_json ) {
    const x = new Date( dateTime.setMinutes( Number( data.NNS ) ) )
    const yTemperature = parseFloat( ( data.V1 / data.count / 10 ).toFixed( 1 ) )
    const yHumidity = parseFloat( ( data.I1 / data.count / 10 ).toFixed( 1 ) )
    if ( yTemperature >= 100 || yTemperature <= 5 || Number.isNaN( yTemperature ) || Number.isNaN( yHumidity ) ) { continue }
    plotX.value.push( x )
    plotTemperatureY.value.push( yTemperature )
    plotHumidityY.value.push( yHumidity )
  }
}


async function fetchSepdificMinutePlotData ( dateTime: Date = new Date ) {
  const dateTime1 = subMinutes( dateTime, 1 )
  const dateTime2 = dateTime
  let response: Response

  try {
    response = await fetch(
      'http://200.0.0.112:5001/ems/get_id_for_TT.php',
      {
        method: 'POST',
        body: JSON.stringify( { device: 'E064', datetime1: format( dateTime1, "yyyy-MM-dd'T'HH:mm:ss'Z'" ), datetime2: format( dateTime2, "yyyy-MM-dd'T'HH:mm:ss'Z'" ) } ),
      },
    )
  } catch ( error ) {
    console.error( error )
    message.error( '讀取後端資料失敗' )
    return false
  }

  const response_json: [ backendDataTypeForMinute ] = await response.json()
  const x = dateTime1
  const yTemperature = parseFloat( ( response_json[ 0 ].V1 / response_json[ 0 ].count / 10 ).toFixed( 1 ) )
  const yHumidity = parseFloat( ( response_json[ 0 ].I1 / response_json[ 0 ].count / 10 ).toFixed( 1 ) )
  plotX.value.push( x )
  plotTemperatureY.value.push( yTemperature )
  plotHumidityY.value.push( yHumidity )
  await Plotly.redraw( 'gd' )
}


onMounted( async () => {
  const now = new Date()
  const thisHour = set( now, { minutes: 0, seconds: 0 } ) // 例如 2023-03-07 15:00:00
  const previousHour = subHours( thisHour, 1 ) // 例如 2023-03-07 14:00:00
  const previous2Hour = subHours( thisHour, 2 ) // 例如 2023-03-07 13:00:00
  const previous3Hour = subHours( thisHour, 3 ) // 例如 2023-03-07 12:00:00
  const previous4Hour = subHours( thisHour, 4 ) // 例如 2023-03-07 11:00:00
  const previous5Hour = subHours( thisHour, 5 ) // 例如 2023-03-07 10:00:00
  const previous6Hour = subHours( thisHour, 6 ) // 例如 2023-03-07 9:00:00
  const previous7Hour = subHours( thisHour, 7 ) // 例如 2023-03-07 8:00:00
  const previous8Hour = subHours( thisHour, 8 ) // 例如 2023-03-07 7:00:00
  const previous9Hour = subHours( thisHour, 9 ) // 例如 2023-03-07 6:00:00
  const previous10Hour = subHours( thisHour, 10 ) // 例如 2023-03-07 5:00:00
  const previous11Hour = subHours( thisHour, 11 ) // 例如 2023-03-07 4:00:00
  const previous12Hour = subHours( thisHour, 12 ) // 例如 2023-03-07 3:00:00
  const previous13Hour = subHours( thisHour, 13 ) // 例如 2023-03-07 2:00:00
  const previous14Hour = subHours( thisHour, 14 ) // 例如 2023-03-07 1:00:00
  const previous15Hour = subHours( thisHour, 15 ) // 例如 2023-03-07 0:00:00
  const previous16Hour = subHours( thisHour, 16 ) // 例如 2023-03-06 23:00:00
  const previous17Hour = subHours( thisHour, 17 ) // 例如 2023-03-06 22:00:00
  const previous18Hour = subHours( thisHour, 18 ) // 例如 2023-03-06 21:00:00
  const previous19Hour = subHours( thisHour, 19 ) // 例如 2023-03-06 20:00:00
  const previous20Hour = subHours( thisHour, 20 ) // 例如 2023-03-06 19:00:00
  const previous21Hour = subHours( thisHour, 21 ) // 例如 2023-03-06 18:00:00
  const previous22Hour = subHours( thisHour, 22 ) // 例如 2023-03-06 17:00:00
  const previous23Hour = subHours( thisHour, 23 ) // 例如 2023-03-06 16:00:00
  const previous24Hour = subHours( thisHour, 24 ) // 例如 2023-03-06 15:00:00
  await fetchSpecificHourPlotData( previous24Hour, previous24Hour.getHours() )
  await fetchSpecificHourPlotData( previous23Hour, previous23Hour.getHours() )
  await fetchSpecificHourPlotData( previous22Hour, previous22Hour.getHours() )
  await fetchSpecificHourPlotData( previous21Hour, previous21Hour.getHours() )
  await fetchSpecificHourPlotData( previous20Hour, previous20Hour.getHours() )
  await fetchSpecificHourPlotData( previous19Hour, previous19Hour.getHours() )
  await fetchSpecificHourPlotData( previous18Hour, previous18Hour.getHours() )
  await fetchSpecificHourPlotData( previous17Hour, previous17Hour.getHours() )
  await fetchSpecificHourPlotData( previous16Hour, previous16Hour.getHours() )
  await fetchSpecificHourPlotData( previous15Hour, previous15Hour.getHours() )
  await fetchSpecificHourPlotData( previous14Hour, previous14Hour.getHours() )
  await fetchSpecificHourPlotData( previous13Hour, previous13Hour.getHours() )
  await fetchSpecificHourPlotData( previous12Hour, previous12Hour.getHours() )
  await fetchSpecificHourPlotData( previous11Hour, previous11Hour.getHours() )
  await fetchSpecificHourPlotData( previous10Hour, previous10Hour.getHours() )
  await fetchSpecificHourPlotData( previous9Hour, previous9Hour.getHours() )
  await fetchSpecificHourPlotData( previous8Hour, previous8Hour.getHours() )
  await fetchSpecificHourPlotData( previous7Hour, previous7Hour.getHours() )
  await fetchSpecificHourPlotData( previous6Hour, previous6Hour.getHours() )
  await fetchSpecificHourPlotData( previous5Hour, previous5Hour.getHours() )
  await fetchSpecificHourPlotData( previous4Hour, previous4Hour.getHours() )
  await fetchSpecificHourPlotData( previous3Hour, previous3Hour.getHours() )
  await fetchSpecificHourPlotData( previous2Hour, previous2Hour.getHours() )
  await fetchSpecificHourPlotData( previousHour, previousHour.getHours() )
  await fetchSpecificHourPlotData( thisHour, thisHour.getHours() )

  Plotly.register( locale )
  await Plotly.newPlot( "gd", plotlyData, plotlyLayout, plotlyConfig )
  loading.value = !loading.value
} )
</script>



<template>
  <n-el tag="main">
    <n-spin size="large" :show=" loading ">
      <n-grid cols=" 1 l:3  " :x-gap=" 40 " :y-gap=" 40 " style="margin-block-end: 40px;" responsive="screen">
        <n-gi style="border-radius: 30px; box-shadow: 10px 10px 6px hsla(0, 0%, 0%, 0.16); background-color: white;">
          <n-card style="border-radius: 30px; border: none;" size="huge">
            <div style="text-align: center; font-size: 80px; line-height: 100%;">🌡️</div>
            <div
              style="color: hsla(0, 0%, 72%, 1); text-align: center; font-size: 20px; line-height: 100%; margin-block: 1em;">
              Temperature
            </div>
            <div style="font-weight: bold; text-align: center">
              <span style="font-size: 60px; line-height: 100%;">{{ latestTemperature }}</span>
              <span style="font-size: 40px; line-height: 100%;">°C</span>
            </div>
          </n-card>
        </n-gi>

        <n-gi style="border-radius: 30px; box-shadow: 10px 10px 6px hsla(0, 0%, 0%, 0.16); background-color: white;">
          <n-card style="border-radius: 30px; border: none;" size="huge">
            <div style="text-align: center; font-size: 80px; line-height: 100%;">💦</div>
            <div
              style="color: hsla(0, 0%, 72%, 1); text-align: center; font-size: 20px; line-height: 100%; margin-block: 1em;">
              Humidity
            </div>
            <div style="font-weight: bold; text-align: center;">
              <span style="font-size: 60px; line-height: 100%;">{{ latestHumidity }}</span>
              <span style="font-size: 40px; line-height: 100%;">%</span>
            </div>
          </n-card>
        </n-gi>

        <n-gi
          style="border-radius: 30px; box-shadow: 10px 10px 6px hsla(0, 0%, 0%, 0.16); background-color: var(--close-icon-color);">
          <n-config-provider :theme=" darkTheme ">
            <n-card style="border-radius: 30px; background-color: unset; border-color: var(--close-icon-color);"
              size="huge">
              <div
                style="font-size: 36px; text-align: center; color: var(--clear-color); text-align: right; line-height: 100%; margin-block-end: 1rem;">
                {{ format( clockTime, 'yyyy-MM-dd' ) }}
              </div>
              <div style="font-size: 80px; line-height: 100%; text-align: right;">{{ format( clockTime, 'hh:mm' ) }}
              </div>
              <div style="font-size: 60px; line-height: 100%; color: var(--clear-color); text-align: right;">{{ format( clockTime, 'a' ) }}</div>
            </n-card>
          </n-config-provider>
        </n-gi>
      </n-grid>
      <n-card style="border-radius: 30px; box-shadow: 10px 10px 6px hsla(0, 0%, 0%, 0.16); border: none;" size="huge">
        <template #header>
          <!-- <span style="color: hsla(0, 0%, 72%, 1);">當日走勢</span> -->
        </template>
        <div id="gd"></div>
      </n-card>
    </n-spin>
  </n-el>
</template>


<style>
</style>
