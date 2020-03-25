<template>
  <div class="Statistics d-flex flex-column flex">
    <v-app-bar app dense class="flex-grow-0">
      <v-spacer />
      <v-toolbar-items>
        <v-switch
          v-model="useParticipantRelativeValues"
          hide-details
          class="align-center"
        >
          <template #label>
            Participant-relative
            <v-tooltip bottom max-width="300">
              <template #activator="{ on }">
                <v-icon class="ml-2" v-on="on" @click.stop>mdi-help-circle</v-icon>
              </template>

              <p>
                When enabled, all logged values will be averaged
                by the number of participants within a group.
              </p>
              <p>
                <strong>This means small groups will be on even-footing with big ones.</strong>
              </p>
            </v-tooltip>
          </template>
        </v-switch>
      </v-toolbar-items>
      <v-spacer />
    </v-app-bar>

    <div class="d-flex flex-column justify-space-between flex">
      <GChart
        type="BarChart"
        :data="groupData"
        :options="{ ...groupOptions, title: 'Overall' }"
        class="my-4"
        @ready="loaded.overall = true;"
      />
      <Loader class="ma-auto" v-if="!loaded.overall" />

      <v-divider />
      <GChart
        type="AreaChart"
        :data="aggregatedData"
        :options="{ ...options, title: 'Daily Progression' }"
        class="my-4"
        @ready="loaded.progress = true;"
      />
      <Loader class="ma-auto" v-if="!loaded.progress" />

      <v-divider />
      <GChart
        type="ColumnChart"
        :data="data"
        :options="{ ...options, title: 'Daily Contributions' }"
        class="my-4"
        @ready="loaded.aggregate = true;"
      />
      <Loader class="ma-auto" v-if="!loaded.aggregate" />
    </div>
  </div>
</template>

<script>
import Vue from 'vue';
import { GChart } from 'vue-google-charts';
import groupBy from 'lodash.groupby';
import { idKey } from '@/plugins/firebase';
import { toDateStr } from '@/utils';
import Loader from '@/components/Loader.vue';

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
    compliments: Array,
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
      loaded: {
        overall: false,
        progress: false,
        aggregate: false,
      },
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
        height: 300,
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
        height: 300,
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
    Loader,
    GChart,
  },
});
</script>
