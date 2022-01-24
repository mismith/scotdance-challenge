<script>
import Vue from 'vue'
import { HorizontalBar, mixins } from 'vue-chartjs'

export default Vue.extend({
  name: 'HorizontalBarChart',
  extends: HorizontalBar,
  mixins: [mixins.reactiveProp],
  props: {
    chartOptions: {
      type: Object,
      default: () => ({}),
    },
  },
  mounted() {
    this.renderChart(this.chartData, this.chartOptions)
  },
})
</script>
