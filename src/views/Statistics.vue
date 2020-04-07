<template>
  <div class="Statistics flex-page">
    <Loader v-if="loading" class="ma-auto" />
    <div v-else-if="!relevantEntries.length" class="d-flex flex-column align-center ma-auto">
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
          <FilterBy :groups="relevantGroups" :country-ids.sync="filterDataByCountryIds" />
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
              height: `${Math.max(128, 24 * (sortedGroups.length + 1))}px`,
            }"
          />
        </div>
      </v-carousel-item>
      <v-carousel-item>
        <v-subheader class="primary--text subtitle-1 justify-space-between">
          <FilterBy :groups="relevantGroups" :country-ids.sync="filterDataByCountryIds" />
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
              height: `${Math.max(128, 24 * (sortedGroups.length + 1))}px`,
            }"
          />
        </div>
      </v-carousel-item>
      <v-carousel-item>
        <v-subheader class="primary--text subtitle-1 justify-space-between">
          <FilterBy
            :groups="relevantGroups"
            :country-ids.sync="filterDataByCountryIds"
            :dirty="Boolean(filterDataByGroupIds.length)"
          >
            <Picker
              v-model="filterDataByGroupIds"
              :label="$root.labels.Group"
              outlined
              rounded
              clearable
              multiple
              dense
              hide-details
              :placeholder="`All ${$root.labels.Group}s`"
              :menu-props="{ width: '100%', offsetY: true }"
              :hide-no-data="false"
              :items="relevantGroups"
              :item-value="idKey"
              item-text="$name"
              class="mt-4 mx-4"
            />
          </FilterBy>
          {{ $root.labels.Participant }} Totals
          <SortBy v-model="orderDataById" :items="orderDataBys" />
        </v-subheader>

        <div class="chartjs-size-wrapper flex d-flex flex-column scroll-y">
          <div
            v-if="!sortedParticipants.length"
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
              height: `${Math.max(128, 24 * (sortedParticipants.length + 1))}px`,
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
import FilterBy from '@/components/FilterBy.vue';
import SortBy from '@/components/SortBy.vue';
import Picker from '@/components/Picker.vue';
import { getEmojiFlag } from 'countries-list';

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

const SI_SYMBOL = ['', 'k', 'M', 'G', 'T', 'P', 'E'];
function abbreviateNumber(number) {
  const tier = Math.log10(number) / 3 | 0; // eslint-disable-line
  if (!tier) return number;

  const suffix = SI_SYMBOL[tier];
  const scale = 10 ** (tier * 3);
  const scaled = number / scale;
  return `${scaled.toFixed(1)}${suffix}`;
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
    filterDataByGroupIds: {
      type: Array,
    },
    filterDataByCountryIds: {
      type: Array,
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

    relevantGroups() {
      if (this.currentChallenge) {
        return this.groups
          .filter(({ challengeId }) => challengeId === this.currentChallenge[idKey]);
      }
      return this.groups;
    },
    relevantParticipants() {
      if (this.currentChallenge) {
        return this.participants
          .filter(({ challengeId }) => challengeId === this.currentChallenge[idKey]);
      }
      return this.participants;
    },
    relevantEntries() {
      if (this.currentChallenge) {
        return this.entries
          .filter(({ challengeId }) => challengeId === this.currentChallenge[idKey]);
      }
      return this.entries;
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
              callback: (value) => abbreviateNumber(unflatten(value)),
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
              if (!this.filterDataByGroupIds.length) return null;

              const participant = this.sortedParticipants[index] || {};
              return participant && `${participant.$group.name}`;
            },
          },
        },
        elements: {
          rectangle: {
            backgroundColor: ({ dataIndex }) => get(
              this.sortedParticipants,
              `${dataIndex}.$group.color`,
              '#000000',
            ),
          },
        },
      };
    },

    sortedParticipants() {
      let participantsWithValues = this.relevantParticipants
        .map((item) => {
          // eslint-disable-next-line no-param-reassign
          item.$name = item.$group && item.$group.country
            ? `${item.name} ${getEmojiFlag(item.$group.country)}`
            : item.name;
          // eslint-disable-next-line no-param-reassign
          item.$total = sumItemEntries(this.relevantEntries, item, 'participantId');
          return item;
        })
        .filter(({ $total }) => $total);

      if (this.filterDataByCountryIds.length) {
        participantsWithValues = participantsWithValues
          .filter(({ $group }) => $group && this.filterDataByCountryIds.includes($group.country));
      }
      if (this.filterDataByGroupIds.length && this.currentSlide === 2) {
        participantsWithValues = participantsWithValues
          .filter(({ $group }) => $group && this.filterDataByGroupIds.includes($group[idKey]));
      }
      if (this.orderDataBy) {
        participantsWithValues = orderBy(
          participantsWithValues,
          this.orderDataBy.keys,
          this.orderDataBy.dirs,
        );
      }
      return participantsWithValues;
    },
    sortedGroups() {
      let groupsWithValues = this.relevantGroups
        .map((item) => {
          const sum = sumItemEntries(this.relevantEntries, item, 'groupId');
          // eslint-disable-next-line no-param-reassign
          item.$total = sum;
          // eslint-disable-next-line no-param-reassign
          item.$average = getParticipantRelativeValue(sum, this.sortedParticipants, item[idKey]);
          return item;
        })
        .filter(({ $total }) => $total);

      if (this.filterDataByCountryIds.length) {
        groupsWithValues = groupsWithValues
          .filter(({ country }) => this.filterDataByCountryIds.includes(country));
      }
      if (this.orderDataBy) {
        groupsWithValues = orderBy(
          groupsWithValues,
          this.orderDataBy.keys,
          this.orderDataBy.dirs,
        );
      }
      return groupsWithValues;
    },

    groupDataPerParticipant() {
      const groupDataPerParticipant = this.gatherData(this.sortedGroups, '$average');
      // console.log(groupDataPerParticipant);
      return groupDataPerParticipant;
    },
    groupData() {
      const groupData = this.gatherData(this.sortedGroups);
      // console.log(groupData);
      return groupData;
    },
    participantData() {
      const participantData = this.gatherData(this.sortedParticipants);
      // console.log(participantData);
      return participantData;
    },
  },
  methods: {
    get,

    gatherData(items, key = '$total') {
      return {
        labels: items.map(({ name, $name }) => $name || name),
        datasets: [{
          data: items.map((item) => flatten(item[key])),
        }],
      };
    },
  },
  components: {
    Loader,
    HorizontalBarChart,
    FilterBy,
    SortBy,
    Picker,
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
  }
}
</style>
