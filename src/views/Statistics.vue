<template>
  <div class="Statistics flex-page">
    <Loader v-if="loading" class="ma-auto" />
    <div v-else-if="!filteredEntries.length" class="d-flex flex-column align-center ma-auto">
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
        <v-subheader class="primary--text subtitle-1 justify-space-between">
          <v-btn icon style="visibility: hidden;" />
          {{ $root.labels.Group }} Averages
          <SortBy v-model="orderDataById" :items="orderDataBys" />
        </v-subheader>

        <div class="chartjs-size-wrapper flex d-flex flex-column scroll-y">
          <HorizontalBarChart
            :chart-data="groupDataPerParticipant"
            :chart-options="chartOptions"
            class="flex-shrink-0"
            :styles="{
              position: 'relative',
              height: `${Math.max(128, 32 * sortedGroups.length + 1)}px`,
            }"
          />
        </div>
      </v-carousel-item>
      <v-carousel-item>
        <v-subheader class="primary--text subtitle-1 justify-space-between">
          <v-btn icon style="visibility: hidden;" />
          {{ $root.labels.Group }} Totals
          <SortBy v-model="orderDataById" :items="orderDataBys" />
        </v-subheader>

        <div class="chartjs-size-wrapper flex d-flex flex-column scroll-y">
          <HorizontalBarChart
            :chart-data="groupData"
            :chart-options="chartOptions"
            class="flex-shrink-0"
            :styles="{
              position: 'relative',
              height: `${Math.max(128, 32 * sortedGroups.length + 1)}px`,
            }"
          />
        </div>
      </v-carousel-item>
      <v-carousel-item>
        <v-subheader class="primary--text subtitle-1 justify-space-between">
          <v-btn icon style="visibility: hidden;" />
          {{ $root.labels.Participant }} Totals
          <SortBy v-model="orderDataById" :items="orderDataBys" />
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
            :items="filteredGroups"
            :item-value="idKey"
            :label="`Filter by ${$root.labels.Group}`"
            item-text="name"
          >
            <template #item="{ item }">
              <v-avatar size="16" :color="item.color" class="mr-2" style="margin-top: -2px" />
              {{ item.name }}
            </template>
          </v-select>
        </header>

        <div class="chartjs-size-wrapper flex d-flex flex-column scroll-y has-header">
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
import HorizontalBarChart from '@/components/HorizontalBarChart.vue';
import SortBy from '@/components/SortBy.vue';

// exponentially curb values to that outliers are less prominent in chart axes
const flatten = (v) => v ** (1 / 2);
const unflatten = (v) => Math.round(v ** 2);

function getParticipantRelativeValue(value, sortedParticipants, id) {
  const numGroupParticipants = sortedParticipants.filter(({ groupId }) => groupId === id).length;
  return numGroupParticipants ? Math.round(value / numGroupParticipants) : 0;
}
function sumItemEntries(allEntries, item, key) {
  const entries = allEntries.filter((entry) => entry[key] === item[idKey]);
  const sum = entries.reduce((acc, { value }) => acc + value, 0);
  return sum;
}
function gatherData(allEntries, items, key = '$total', transformValue = flatten) {
  return {
    labels: items.map(({ name }) => name),
    datasets: [{
      data: items.map((item) => transformValue(item[key])),
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
    currentChallengeId: String,
  },
  localStorage: {
    currentSlide: {
      type: Number,
    },
    currentGroupId: {
      type: String,
    },
    orderDataById: {
      type: String,
    },
  },
  data() {
    return {
      idKey,
    };
  },
  watch: {
    orderDataBys(orderDataBys) {
      const orderDataBy = findByIdKey(orderDataBys, this.orderDataById);
      if (!orderDataBy) {
        this.orderDataById = this.orderDataBys[0][idKey];
      }
    },
  },
  computed: {
    currentChallenge() {
      return findByIdKey(this.challenges, this.currentChallengeId);
    },

    filteredGroups() {
      if (this.currentChallenge) {
        return this.groups
          .filter(({ challengeId }) => challengeId === this.currentChallenge[idKey]);
      }
      return this.groups;
    },
    filteredParticipants() {
      if (this.currentChallenge) {
        return this.participants
          .filter(({ challengeId }) => challengeId === this.currentChallenge[idKey]);
      }
      return this.participants;
    },
    filteredEntries() {
      if (this.currentChallenge) {
        return this.entries
          .filter(({ challengeId }) => challengeId === this.currentChallenge[idKey]);
      }
      return this.entries;
    },

    currentGroup() {
      return findByIdKey(this.filteredGroups, this.currentGroupId);
    },
    orderDataBys() {
      return [
        {
          [idKey]: 'name',
          name: 'Name',
          keys: ['name'],
        },
        {
          [idKey]: 'value',
          name: this.currentSlide === 0 ? 'Average' : 'Total',
          keys: [this.currentSlide === 0 ? '$average' : '$total'],
          dirs: ['desc'],
        },
      ];
    },
    orderDataBy() {
      return findByIdKey(this.orderDataBys, this.orderDataById);
    },

    chartOptions() {
      return {
        legend: false,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          xAxes: [{
            ticks: {
              beginAtZero: true,
              min: 0,
              callback: (value) => unflatten(value).toLocaleString(),
            },
          }],
        },
        tooltips: {
          callbacks: {
            label: ({ xLabel }) => unflatten(xLabel).toLocaleString(),
            title: ([{ yLabel, index }]) => {
              if (this.orderDataBy && this.orderDataBy[idKey] === 'value') {
                return `${yLabel} [${index + 1}]`;
              }
              return yLabel;
            },
          },
        },
        elements: {
          rectangle: {
            backgroundColor: ({ dataIndex }) => get(
              this.sortedGroups,
              `${dataIndex}.color`,
              '#000000',
            ),
          },
        },
      };
    },
    participantChartOptions() {
      return {
        ...this.chartOptions,
        tooltips: {
          ...this.chartOptions.tooltips,
          callbacks: {
            ...this.chartOptions.tooltips.callbacks,
            afterTitle: ([{ index }]) => {
              if (this.currentGroup) return null;

              const participant = this.participantsInCurrentGroup[index] || {};
              return participant && `(${participant.$group.name})`;
            },
          },
        },
        elements: {
          rectangle: {
            backgroundColor: ({ dataIndex }) => get(
              this.participantsInCurrentGroup,
              `${dataIndex}.$group.color`,
              '#000000',
            ),
          },
        },
      };
    },

    sortedParticipants() {
      const participantsWithValues = this.filteredParticipants.map((item) => {
        // eslint-disable-next-line no-param-reassign
        item.$total = sumItemEntries(this.filteredEntries, item, 'participantId');
        return item;
      });
      if (this.orderDataBy) {
        return orderBy(
          participantsWithValues,
          this.orderDataBy.keys,
          this.orderDataBy.dirs,
        );
      }
      return participantsWithValues;
    },
    sortedGroups() {
      const groupsWithValues = this.filteredGroups.map((item) => {
        const sum = sumItemEntries(this.filteredEntries, item, 'groupId');
        // eslint-disable-next-line no-param-reassign
        item.$total = sum;
        // eslint-disable-next-line no-param-reassign
        item.$average = getParticipantRelativeValue(sum, this.sortedParticipants, item[idKey]);
        return item;
      });
      if (this.orderDataBy) {
        return orderBy(
          groupsWithValues,
          this.orderDataBy.keys,
          this.orderDataBy.dirs,
        );
      }
      return groupsWithValues;
    },
    participantsInCurrentGroup() {
      if (this.currentGroup) {
        return this.sortedParticipants
          .filter(({ groupId }) => groupId === this.currentGroup[idKey]);
      }
      return this.sortedParticipants;
    },

    groupDataPerParticipant() {
      const groupDataPerParticipant = gatherData(
        this.filteredEntries,
        this.sortedGroups,
        '$average',
      );
      // console.log(groupDataPerParticipant);
      return groupDataPerParticipant;
    },
    groupData() {
      const groupData = gatherData(this.filteredEntries, this.sortedGroups);
      // console.log(groupData);
      return groupData;
    },
    participantData() {
      const participantData = gatherData(this.filteredEntries, this.participantsInCurrentGroup);
      // console.log(participantData);
      return participantData;
    },
  },
  methods: {
    get,
  },
  components: {
    Loader,
    HorizontalBarChart,
    SortBy,
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
    // @HACK: appbar/title/carousel-delimiters/bottom-nav
    max-height: calc(100vh - 56px - 48px - 50px - 56px);

    &.has-header {
      // @HACK: appbar/title/select/carousel-delimiters/bottom-nav
      max-height: calc(100vh - 56px - 48px - 52px - 50px - 56px);
    }
  }
}
</style>
