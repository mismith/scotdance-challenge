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
        <v-subheader class="primary--text subtitle-1 justify-center">
          {{ $root.labels.Participant }} Averages by {{ $root.labels.Group }}
        </v-subheader>

        <div class="chartjs-size-wrapper flex d-flex flex-column scroll-y">
          <HorizontalBarChart
            :chart-data="groupDataPerParticipant"
            :chart-options="chartOptions"
            class="flex-shrink-0"
            :styles="{
              position: 'relative',
              height: `${Math.max(128, 32 * filteredGroups.length + 1)}px`,
            }"
          />
        </div>
      </v-carousel-item>
      <v-carousel-item>
        <v-subheader class="primary--text subtitle-1 justify-center">
          {{ $root.labels.Group }} Totals
        </v-subheader>

        <div class="chartjs-size-wrapper flex d-flex flex-column scroll-y">
          <HorizontalBarChart
            :chart-data="groupData"
            :chart-options="chartOptions"
            class="flex-shrink-0"
            :styles="{
              position: 'relative',
              height: `${Math.max(128, 32 * filteredGroups.length + 1)}px`,
            }"
          />
        </div>
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
          <v-menu min-width="200">
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

// exponentially curb values to that outliers are less prominent in chart axes
const flatten = (v) => v ** (1 / 2);
const unflatten = (v) => Math.round(v ** 2);

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
              callback: (value) => unflatten(value).toLocaleString(),
            },
          }],
        },
        tooltips: {
          callbacks: {
            label: ({ xLabel }) => unflatten(xLabel).toLocaleString(),
          },
        },
        elements: {
          rectangle: {
            backgroundColor: ({ dataIndex }) => get(
              this.filteredGroups,
              `${dataIndex}.color`,
              '#000000',
            ),
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
      const participantsWithValues = this.filteredParticipants.map((item) => {
        // eslint-disable-next-line no-param-reassign
        item.$value = sumItemEntries(this.filteredEntries, item, 'participantId');
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
        return this.groupedParticipants
          .filter(({ groupId }) => groupId === this.currentGroup[idKey]);
      }
      return this.groupedParticipants;
    },

    groupDataPerParticipant() {
      const groupDataPerParticipant = gatherData(
        this.filteredEntries,
        this.filteredGroups,
        'groupId',
        (sum, group) => flatten(
          getParticipantRelativeValue(sum, this.groupedParticipants, group[idKey]),
        ),
      );
      // console.log(groupDataPerParticipant);
      return groupDataPerParticipant;
    },
    groupData() {
      const groupData = gatherData(
        this.filteredEntries,
        this.filteredGroups,
        'groupId',
        flatten,
      );
      // console.log(groupData);
      return groupData;
    },
    participantData() {
      const participantData = gatherData(
        this.filteredEntries,
        this.participantsInCurrentGroup,
        'participantId',
        flatten,
      );
      // console.log(participantData);
      return participantData;
    },
    participantChartOptions() {
      return {
        ...this.chartOptions,
        tooltips: {
          ...this.chartOptions.tooltips,
          callbacks: {
            ...this.chartOptions.tooltips.callbacks,
            title: ([{ yLabel, index }]) => {
              if (this.orderParticipantsBy && this.orderParticipantsBy.keys[0] === '$value') {
                return `${yLabel} [${index + 1}]`;
              }
              return yLabel;
            },
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
  },
  methods: {
    get,
  },
  components: {
    Loader,
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
    // @HACK: appbar/title/carousel-delimiters/bottom-nav
    max-height: calc(100vh - 56px - 48px - 50px - 56px);

    &.has-header {
      // @HACK: appbar/title/select/carousel-delimiters/bottom-nav
      max-height: calc(100vh - 56px - 48px - 52px - 50px - 56px);
    }
  }
}
</style>
