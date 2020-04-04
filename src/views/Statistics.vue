<template>
  <div class="Statistics flex-page">
    <Loader v-if="loading" class="ma-auto" />
    <div v-else-if="!entries.length" class="d-flex flex-column align-center ma-auto">
      <v-icon x-large>mdi-cancel</v-icon>
      No entries yet
    </div>
    <v-carousel
      v-else
      v-model="currentSlide"
      :show-arrows="false"
      hide-delimiter-background
      light
      height="100%"
    >
      <v-carousel-item>
        <v-subheader class="primary--text subtitle-1 justify-center">
          {{ $root.labels.Participant }} Averages by {{ $root.labels.Group }}
        </v-subheader>
        <BarChart
          :chart-data="groupDataPerParticipant"
          :chart-options="chartOptions"
          class="chartjs-size-wrapper"
        />
      </v-carousel-item>
      <v-carousel-item>
        <v-subheader class="primary--text subtitle-1 justify-center">
          {{ $root.labels.Group }} Totals
        </v-subheader>
        <BarChart
          :chart-data="groupData"
          :chart-options="chartOptions"
          class="chartjs-size-wrapper"
        />
      </v-carousel-item>
      <v-carousel-item>
        <v-subheader class="primary--text subtitle-1 justify-center">
          {{ $root.labels.Participant }} Totals
        </v-subheader>
        <header class="d-flex px-3 pb-3">
          <v-select
            v-model="currentGroupId"
            outlined
            rounded
            dense
            clearable
            hide-details
            :placeholder="`All ${$root.labels.Group}s`"
            :items="groups"
            :item-value="idKey"
            :label="`Filter by ${$root.labels.Group}`"
            item-text="name"
          >
            <template #item="{ item }">
              <v-avatar size="16" :color="item.color" class="mr-2" style="margin-top: -2px" />
              {{ item.name }}
            </template>
          </v-select>
          <v-menu>
            <template #activator="{ on }">
              <v-btn icon v-on="on" class="ml-3"><v-icon>mdi-sort-variant</v-icon></v-btn>
            </template>

            <v-list>
              <v-subheader>Sort by</v-subheader>
              <v-list-item
                v-for="by in orderParticipantsBys"
                :key="by.name"
                :class="{ 'v-list-item--active': orderParticipantsById === by[idKey] }"
                @click="orderParticipantsById = by[idKey]"
              >
                {{ by.name }}
              </v-list-item>
            </v-list>
          </v-menu>
        </header>
        <div class="chartjs-size-wrapper flex d-flex flex-column scroll-y">
          <div
            v-if="!participantsInCurrentGroup.length"
            class="d-flex flex-column align-center ma-auto"
          >
            <v-icon x-large>mdi-cancel</v-icon>
            No entries yet
          </div>
          <HorizontalBarChart
            v-else
            :chart-data="participantData"
            :chart-options="participantChartOptions"
            class="flex-shrink-0"
            :styles="{
              position: 'relative',
              height: `${Math.max(128, 32 * participantsInCurrentGroup.length + 1)}px`,
            }"
          />
        </div>
      </v-carousel-item>
    </v-carousel>
  </div>
</template>

<script>
import Vue from 'vue';
import get from 'lodash.get';
import orderBy from 'lodash.orderby';
import { idKey, findByIdKey } from '@/plugins/firebase';
import Loader from '@/components/Loader.vue';
import BarChart from '@/components/BarChart.vue';
import HorizontalBarChart from '@/components/HorizontalBarChart.vue';

function getParticipantRelativeValue(value, groupedParticipants, id) {
  const numGroupParticipants = groupedParticipants.filter(({ groupId }) => groupId === id).length;
  return numGroupParticipants ? Math.round(value / numGroupParticipants) : 0;
}
function sumItemEntries(allEntries, item, key, transformValue = (v) => v) {
  const entries = allEntries.filter((entry) => entry[key] === item[idKey]);
  const sum = entries.reduce((acc, { value }) => acc + value, 0);
  return transformValue(sum, item);
}
function gatherData(allEntries, items, key, transformValue = undefined) {
  return {
    labels: items.map(({ name }) => name),
    datasets: [{
      data: items.map((item) => sumItemEntries(allEntries, item, key, transformValue)),
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
    loading: Boolean,
  },
  localStorage: {
    currentSlide: {
      type: Number,
    },
    currentGroupId: {
      type: String,
    },
    orderParticipantsById: {
      type: String,
    },
  },
  data() {
    return {
      idKey,
      chartOptions: {
        legend: false,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          xAxes: [{
            ticks: {
              beginAtZero: true,
              min: 0,
              callback: (value) => (typeof value === 'number' ? value.toLocaleString() : value),
            },
          }],
          yAxes: [{
            ticks: {
              beginAtZero: true,
              min: 0,
              callback: (value) => (typeof value === 'number' ? value.toLocaleString() : value),
            },
          }],
        },
        tooltips: {
          callbacks: {
            label: ({ value }) => Number(value).toLocaleString(),
          },
        },
        elements: {
          rectangle: {
            backgroundColor: ({ dataIndex }) => get(this.groups, `${dataIndex}.color`),
          },
        },
      },
    };
  },
  watch: {
    orderParticipantsBys(orderParticipantsBys) {
      const orderParticipantsBy = findByIdKey(orderParticipantsBys, this.orderParticipantsById);
      if (!orderParticipantsBy) {
        this.orderParticipantsById = this.orderParticipantsBys[0][idKey];
      }
    },
  },
  computed: {
    currentGroup() {
      return findByIdKey(this.groups, this.currentGroupId);
    },
    orderParticipantsBys() {
      return [
        {
          [idKey]: 'group-participant',
          name: `Name by ${this.$root.labels.Group}`,
          keys: ['$group.name', 'name'],
          byGroup: true,
        },
        {
          [idKey]: 'group-value',
          name: `Total by ${this.$root.labels.Group}`,
          keys: ['$group.name', '$value'],
          dirs: ['asc', 'desc'],
          byGroup: true,
        },
        {
          [idKey]: 'participant',
          name: 'Name',
          keys: ['name'],
        },
        {
          [idKey]: 'value',
          name: 'Total',
          keys: ['$value'],
          dirs: ['desc'],
        },
      ]
        .filter(({ byGroup }) => !this.currentGroup || !byGroup);
    },
    orderParticipantsBy() {
      return findByIdKey(this.orderParticipantsBys, this.orderParticipantsById);
    },

    groupedParticipants() {
      const participantsWithValues = this.participants.map((item) => {
        // eslint-disable-next-line no-param-reassign
        item.$value = sumItemEntries(this.entries, item, 'participantId');
        return item;
      });
      if (this.orderParticipantsBy) {
        return orderBy(
          participantsWithValues,
          this.orderParticipantsBy.keys,
          this.orderParticipantsBy.dirs,
        );
      }
      return participantsWithValues;
    },
    participantsInCurrentGroup() {
      if (this.currentGroup) {
        return this.groupedParticipants.filter(({ groupId }) => groupId === this.currentGroupId);
      }
      return this.groupedParticipants;
    },

    groupDataPerParticipant() {
      const groupDataPerParticipant = gatherData(
        this.entries,
        this.groups,
        'groupId',
        (sum, group) => getParticipantRelativeValue(sum, this.groupedParticipants, group[idKey]),
      );
      // console.log(groupDataPerParticipant);
      return groupDataPerParticipant;
    },
    groupData() {
      const groupData = gatherData(this.entries, this.groups, 'groupId');
      // console.log(groupData);
      return groupData;
    },
    participantData() {
      const participantData = gatherData(
        this.entries,
        this.participantsInCurrentGroup,
        'participantId',
        (v) => v ** (1 / 2), // 'flatten' the values to make outliers less prominent
      );
      // console.log(participantData);
      return participantData;
    },
    participantChartOptions() {
      return {
        ...this.chartOptions,
        scales: {
          ...this.chartOptions.scales,
          xAxes: [{
            ...this.chartOptions.scales.xAxes[0],
            ticks: {
              ...this.chartOptions.scales.xAxes[0].ticks,
              callback: (value) => Math.round(value ** 2).toLocaleString(),
            },
          }],
        },
        tooltips: {
          ...this.chartOptions.tooltips,
          callbacks: {
            title: ([{ yLabel, index }]) => {
              if (this.orderParticipantsBy && this.orderParticipantsBy.keys.includes('$value')) {
                return `${yLabel} [${index + 1}]`;
              }
              return yLabel;
            },
            afterTitle: ([{ index }]) => {
              if (this.currentGroup) return null;

              const participant = this.participantsInCurrentGroup[index] || {};
              return participant && `(${participant.$group.name})`;
            },
            // un-'flatten' value
            label: ({ xLabel }) => Math.round(xLabel ** 2).toLocaleString(),
          },
        },
        elements: {
          rectangle: {
            backgroundColor: ({ dataIndex }) => get(
              this.participantsInCurrentGroup,
              `${dataIndex}.$group.color`,
            ),
          },
        },
      };
    },
  },
  methods: {
    get,
  },
  components: {
    Loader,
    BarChart,
    HorizontalBarChart,
  },
});
</script>

<style lang="scss">
.Statistics {
  height: 100%;

  .v-carousel {
    .v-carousel__item {
      > .v-responsive__content {
        display: flex;
        flex-direction: column;
        padding-bottom: 50px; // for carousel delimeters
      }
    }
  }

  .chartjs-size-wrapper {
    flex: auto;
    position: relative;
    // @HACK: title/carousel-delimiters/bottom-nav
    max-height: calc(100vh - 48px - 50px - 56px);

    &.scroll-y {
      // @HACK: title/select/carousel-delimiters/bottom-nav
      max-height: calc(100vh - 48px - 52px - 50px - 56px);
    }
  }
}
</style>
