<script>
import Vue from 'vue';
import { Bar, mixins } from 'vue-chartjs';

export default Vue.extend({
  extends: Bar,
  name: 'BarChart',
  mixins: [mixins.reactiveProp],
  props: {
    chartOptions: Object,
  },
  mounted() {
    this.renderChart(this.chartData, this.chartOptions);
  },
});
</script>
