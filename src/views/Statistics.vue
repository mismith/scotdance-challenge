<template>
  <div class="Statistics d-flex flex-column flex">
    <v-app-bar app dense class="flex-grow-0">
      <v-spacer />
      <v-toolbar-items>
        <v-switch
          v-model="useParticipantRelativeValues"
          label="Participant-relative"
          hide-details
          class="align-center"
        />
      </v-toolbar-items>
      <v-spacer />
    </v-app-bar>

    <div class="d-flex flex-column justify-space-between flex">
      <GChart
        type="BarChart"
        :data="groupData"
        :options="{ ...groupOptions, title: 'Overall' }"
        class="my-4"
      />
      <v-divider />
      <GChart
        type="AreaChart"
        :data="aggregatedData"
        :options="{ ...options, title: 'Daily Progression' }"
        class="my-4"
      />
      <v-divider />
      <GChart
        type="ColumnChart"
        :data="data"
        :options="{ ...options, title: 'Daily Contributions' }"
        class="my-4"
      />
    </div>
  </div>
</template>

<script>
import Vue from 'vue';
import { GChart } from 'vue-google-charts';
import groupBy from 'lodash.groupby';
import { idKey } from '@/plugins/firebase';
import { toDateStr } from '@/utils';

function getParticipantRelativeValue(value, groupParticipants, id) {
  const numGroupParticipants = (groupParticipants[id] || []).length;
  return numGroupParticipants ? value / numGroupParticipants : 0;
}

export default Vue.extend({
  name: 'Statistics',
  props: {
    firestoreRefs: Object,
    challenges: Array,
    groups: Array,
    participants: Array,
    entries: Array,
  },
  localStorage: {
    useParticipantRelativeValues: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      idKey,
    };
  },
  computed: {
    groupParticipants() {
      return groupBy(this.participants, ({ groupId }) => groupId);
    },

    options() {
      const options = {
        isStacked: true,
        series: this.groups.map(({ color }) => ({ color })),
        legend: this.$vuetify.breakpoint.smAndDown ? 'top' : 'right',
      };
      // console.log(options);
      return options;
    },
    data() {
      const data = [
        [
          'Date',
          ...this.groups.map(({ name }) => name),
        ],
        ...Object.entries(
          groupBy(this.entries, ({ createdAt }) => toDateStr(createdAt.toDate())),
        )
          .map(([label, entries]) => [
            label,
            ...this.groups.map(
              ({ [idKey]: id }) => {
                const sum = entries
                  .filter(({ groupId }) => groupId === id)
                  .reduce((acc, { value }) => acc + value, 0);
                if (this.useParticipantRelativeValues) {
                  return getParticipantRelativeValue(sum, this.groupParticipants, id);
                }
                return sum;
              },
            ),
          ]),
      ];
      // console.log(data);
      return data;
    },
    aggregatedData() {
      const aggregatedData = [];
      this.data.forEach((row, i) => {
        if (i > 1) {
          const aggregatedRow = [];
          row.forEach((col, j) => {
            if (j > 0) {
              aggregatedRow.push(col + aggregatedData[i - 1][j]);
              return;
            }
            aggregatedRow.push(col);
          });
          aggregatedData.push(aggregatedRow);
          return;
        }
        aggregatedData.push(row);
      });
      // console.log(aggregatedData);
      return aggregatedData;
    },

    groupOptions() {
      const groupOptions = {
        legend: 'none',
        hAxis: {
          minValue: 0,
        },
      };
      // console.log(groupOptions);
      return groupOptions;
    },
    groupData() {
      const groupData = [
        [
          'Group',
          'Total',
          { role: 'style' },
        ],
        ...Object.entries(groupBy(this.entries, ({ $group }) => $group.name))
          .map(([label, entries]) => {
            const group = entries[0].$group;
            let sum = entries.reduce((acc, { value }) => acc + value, 0);
            if (this.useParticipantRelativeValues) {
              sum = getParticipantRelativeValue(sum, this.groupParticipants, group[idKey]);
            }
            return [
              label,
              sum,
              group.color,
            ];
          }),
      ];
      // console.log(groupData);
      return groupData;
    },
  },
  components: {
    GChart,
  },
});
</script>
