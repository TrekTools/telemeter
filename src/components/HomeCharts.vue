<template>
  <div class="charts-container">
    <div class="chart-wrapper">
      <h3>Warp Bois</h3>
      <div class="chart">
        <Line 
          v-if="chartData.warpFloor" 
          :data="chartData.warpFloor" 
          :options="chartOptions.floor"
        />
      </div>
    </div>
    <div class="chart-wrapper">
      <h3>TAC</h3>
      <div class="chart">
        <Line 
          v-if="chartData.tacFloor" 
          :data="chartData.tacFloor" 
          :options="chartOptions.floor"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { createClient } from 'graphql-ws'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const wsClient = createClient({
  url: process.env.VUE_APP_GRAPHQL_ENDPOINT,
  connectionParams: {
    headers: {
      "content-type": "application/json",
      'x-hasura-admin-secret': process.env.VUE_APP_HASURA_ADMIN_SECRET
    }
  }
})

console.log('WebSocket endpoint:', process.env.VUE_APP_GRAPHQL_ENDPOINT)

export default {
  name: 'HomeCharts',
  components: { Line },
  data() {
    return {
      chartData: {
        warpFloor: null,
        tacFloor: null
      },
      chartOptions: {
        floor: {
          responsive: true,
          scales: {
            x: {
              display: false  // Hide x-axis labels
            },
            y: {
              title: {
                display: true,
                text: '$SEI'
              }
            }
          }
        }
      }
    }
  },
  async mounted() {
    console.log('Component mounted')
    await this.fetchData()
  },
  methods: {
    async fetchData() {
      console.log('Fetching data...')
      
      try {
        // First get the max record
        const maxRecordResult = await new Promise((resolve, reject) => {
          wsClient.subscribe(
            {
              query: `
                query recorder {
                  max_record {
                    current_max
                  }
                }
              `
            },
            {
              next: (data) => resolve(data),
              error: (error) => reject(error),
              complete: () => {}
            }
          )
        })

        const maxRecord = maxRecordResult.data.max_record[0].current_max
        const minRecord = maxRecord - 24
        
        console.log('Max record:', maxRecord, 'Min record:', minRecord)

        // Now fetch the time series data
        const result = await new Promise((resolve, reject) => {
          let allData = null  // Declare the variable
          wsClient.subscribe(
            {
              query: `
                query trek_data($minRecord: Int!) {
                  pallet_timeseries(where: {slug: {_in: ["warp-bois", "trek-access-chit"]}, record: {_gte: $minRecord}}) {
                    name
                    record
                    rounded_time
                    floor
                    volume
                    owners
                    auction_count
                  }
                }
              `,
              variables: { minRecord }
            },
            {
              next: (data) => {
                allData = data // Store the data
                resolve(data)  // Only resolve once we have the data
              },
              error: (error) => reject(error),
              complete: () => {
                if (allData) resolve(allData) // Ensure we have data before resolving
              }
            }
          )
        })

        // Add console.log to debug
        console.log('Received data:', result.data.pallet_timeseries)

        const warpData = result.data.pallet_timeseries
          .filter(d => d.name === "Warp Bois")
          .sort((a, b) => new Date(a.rounded_time) - new Date(b.rounded_time))

        const tacData = result.data.pallet_timeseries
          .filter(d => d.name === "Trek Access Chit")
          .sort((a, b) => new Date(a.rounded_time) - new Date(b.rounded_time))

        this.chartData.warpFloor = {
          labels: warpData.map(d => new Date(d.rounded_time).toLocaleString()),
          datasets: [{
            label: 'Floor Price',
            data: warpData.map(d => d.floor),
            borderColor: '#42b983',
            tension: 0.1
          }]
        }

        this.chartData.tacFloor = {
          labels: tacData.map(d => new Date(d.rounded_time).toLocaleString()),
          datasets: [{
            label: 'Floor Price',
            data: tacData.map(d => d.floor),
            borderColor: '#ffbd2e',
            tension: 0.1
          }]
        }
      } catch (error) {
        console.error('Error fetching chart data:', error)
      }
    }
  }
}
</script>

<style scoped>
.charts-container {
  display: flex;
  justify-content: center;
  gap: 20px;
  max-width: 800px;  /* Make charts smaller */
  margin: 0 auto;
}

.chart-wrapper {
  width: 350px;  /* Make charts smaller */
}

.chart {
  height: 300px;
}

h3 {
  color: #42b983;
  margin-bottom: 20px;
  text-align: center;
}
</style>