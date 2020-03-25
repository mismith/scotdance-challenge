<template>
  <div class="Statistics d-flex flex-column flex-grow">
    <BarChart
      :chart-data="groupDataPerParticipant"
      :chart-options="chartOptions"
      class="flex my-4"
    />
    <BarChart
      :chart-data="groupData"
      :chart-options="chartOptions"
      class="flex my-4"
    />
    <HorizontalBarChart
      :chart-data="participantData"
      :chart-options="{
        ...chartOptions,
        elements: {
          rectangle: {
            backgroundColor: ({ dataIndex }) => get(participants, `${dataIndex}.$group.color`),
          },
        },
      }"
      class="flex my-4"
    />
  </div>
</template>

<script>
import Vue from 'vue';
import get from 'lodash.get';
import groupBy from 'lodash.groupby';
import { idKey } from '@/plugins/firebase';
import BarChart from '@/components/BarChart.vue';
import HorizontalBarChart from '@/components/HorizontalBarChart.vue';

function getParticipantRelativeValue(value, groupParticipants, id) {
  const numGroupParticipants = (groupParticipants[id] || []).length;
  return numGroupParticipants ? value / numGroupParticipants : 0;
}
function gatherData(allEntries, items, key, transformValue = (v) => v) {
  return {
    labels: items.map(({ name }) => name),
    datasets: [{
      data: items.map((item) => {
        const entries = allEntries.filter((entry) => entry[key] === item[idKey]);
        const sum = entries.reduce((acc, { value }) => acc + value, 0);
        return transformValue(sum, item);
      }),
    }],
  };
}

export default Vue.extend({
  name: 'Statistics',
  props: {
    firestoreRefs: Object,
    challenges: Array,
    groups: Array,
    participants: Array,
    entries: Array,
    compliments: Array,
  },
  data() {
    return {
      idKey,

      chartOptions: {
        legend: false,
        maintainAspectRatio: false,
        scales: {
          xAxes: [{
            ticks: {
              min: 0,
              beginAtZero: true,
            },
          }],
          yAxes: [{
            ticks: {
              min: 0,
              beginAtZero: true,
            },
          }],
        },
        elements: {
          rectangle: {
            backgroundColor: ({ dataIndex }) => get(this.groups, `${dataIndex}.color`),
          },
        },
      },
    };
  },
  computed: {
    groupData() {
      const groupData = gatherData(this.entries, this.groups, 'groupId');
      // console.log(groupData);
      return groupData;
    },

    groupParticipants() {
      return groupBy(this.participants, ({ groupId }) => groupId);
    },
    groupDataPerParticipant() {
      const groupDataPerParticipant = gatherData(
        this.entries,
        this.groups,
        'groupId',
        (sum, group) => getParticipantRelativeValue(sum, this.groupParticipants, group[idKey]),
      );
      // console.log(groupDataPerParticipant);
      return groupDataPerParticipant;
    },

    participantData() {
      const participantData = gatherData(this.entries, this.participants, 'participantId');
      // console.log(participantData);
      return participantData;
    },
  },
  methods: {
    get,
  },
  components: {
    BarChart,
    HorizontalBarChart,
  },
});
</script>
