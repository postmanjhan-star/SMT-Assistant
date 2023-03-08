<script setup lang="ts">
import { format, set, subHours, subMinutes, subDays, addHours } from 'date-fns'
import { NCard, NDatePicker, NSpace, NSpin, useMessage } from 'naive-ui'
import Plotly from 'plotly.js-dist-min'
import locale from 'plotly.js-locales/zh-tw'
import { computed, onMounted, ref } from 'vue'

const message = useMessage();

const loading = ref<boolean>( true )
const queryDateTimestamp = ref<number>( new Date().getTime() )

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

const plotX = ref<[ Date | null ]>( [ null ] )
const plotTemperatureY = ref<[ number | null ]>( [ null ] )
const plotHumidityY = ref<[ number | null ]>( [ null ] )

const plotlyData = computed<Plotly.Data[]>( () => {
  return [
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
} )

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
    { xref: 'paper', type: 'rect', x0: 0, x1: 1, y0: 25, y1: 100, fillcolor: 'red', opacity: 0.1, line: { width: 0 }, },

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


async function queryByDate ( millisecondTimestamp: number | [ number, number ] ) {
  loading.value = true
  let dateTime = new Date( Number( millisecondTimestamp ) )
  dateTime = new Date( dateTime.setHours( 0, 0, 0, 0 ) )
  plotX.value = [ null ]
  plotTemperatureY.value = [ null ]
  plotHumidityY.value = [ null ]

  let TwentyFourHoursLoopCount = 0
  while ( TwentyFourHoursLoopCount < 24 ) {
    await fetchSpecificHourPlotData( dateTime, dateTime.getHours() )
    dateTime = addHours( dateTime, 1 )
    TwentyFourHoursLoopCount++
  }
  await Plotly.newPlot( "gd", plotlyData.value, plotlyLayout, plotlyConfig )
  loading.value = !loading.value
}


onMounted( async () => {
  Plotly.register( locale )
  await queryByDate( new Date().getTime() )
} )
</script>



<template>
  <n-space vertical size="large">
    <n-space size="large" style="margin-block-end: 40px;">
      <n-card style="border-radius: 30px; box-shadow: 10px 10px 6px hsla(0, 0%, 0%, 0.16); border: none;" size="huge">
        <n-space size="large">
          <n-date-picker v-model:value.lazy=" queryDateTimestamp " type="date"
            @update:value=" queryByDate( $event ) " size="large"></n-date-picker>
        </n-space>
      </n-card>
    </n-space>

    <n-spin size="large" :show=" loading ">
      <n-card style="border-radius: 30px; box-shadow: 10px 10px 6px hsla(0, 0%, 0%, 0.16); border: none;" size="huge">
        <div id="gd"></div>
        <div id="gd2"></div>
      </n-card>
    </n-spin>
  </n-space>
</template>


<style>
</style>
