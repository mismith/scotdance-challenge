<script>
import Vue from 'vue';
import { HorizontalBar, mixins } from 'vue-chartjs';

export default Vue.extend({
  extends: HorizontalBar,
  name: 'HorizontalBarChart',
  mixins: [mixins.reactiveProp],
  props: {
    chartOptions: Object,
  },
  mounted() {
    this.renderChart(this.chartData, this.chartOptions);
  },
});
</script>
