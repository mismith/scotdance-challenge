<template>
  <div class="Statistics flex-page">
    <div v-if="!currentChallenge" class="d-flex flex-column align-center ma-auto">
      <v-icon x-large class="mb-3">mdi-chevron-up</v-icon>
      Select a {{ $root.getLabel('Challenge') }} first.
    </div>
    <div v-else-if="!filteredParticipants.length" class="d-flex flex-column align-center ma-auto">
      <v-icon x-large>mdi-cancel</v-icon>
      No entries yet
      <div class="mt-2"><router-link :to="{ name: 'new' }">Add one</router-link></div>
    </div>
    <v-carousel
      v-else
      v-model="currentSlideIndex"
      :show-arrows="false"
      hide-delimiter-background
      light
      height="100%"
    >
      <v-carousel-item v-if="hasMultipleGroups">
        <v-subheader class="primary--text subtitle-1 justify-space-between">
          <FilterBy
            :all-groups="extendedGroups"
            :country-ids.sync="filterDataByCountryIds"
          />
          {{ $root.getLabel('Group') }} Averages
          <SortBy v-model="orderDataById" :items="orderDataBys" />
        </v-subheader>

        <div class="chartjs-size-wrapper">
          <HorizontalBarChart
            :chart-data="groupDataPerParticipant"
            :chart-options="chartOptions"
            class="flex-shrink-0"
            :styles="{
              position: 'relative',
              height: `${Math.max(128, 24 * (relevantGroups.length + 1))}px`,
            }"
          />
        </div>
      </v-carousel-item>
      <v-carousel-item v-if="hasMultipleGroups">
        <v-subheader class="primary--text subtitle-1 justify-space-between">
          <FilterBy
            :all-groups="extendedGroups"
            :country-ids.sync="filterDataByCountryIds"
          />
          {{ $root.getLabel('Group') }} Totals
          <SortBy v-model="orderDataById" :items="orderDataBys" />
        </v-subheader>

        <div class="chartjs-size-wrapper">
          <HorizontalBarChart
            :chart-data="groupData"
            :chart-options="chartOptions"
            class="flex-shrink-0"
            :styles="{
              position: 'relative',
              height: `${Math.max(128, 24 * (relevantGroups.length + 1))}px`,
            }"
          />
        </div>
      </v-carousel-item>
      <v-carousel-item>
        <v-subheader class="primary--text subtitle-1 justify-space-between">
          <FilterBy
            :all-groups="extendedGroups"
            :country-ids.sync="filterDataByCountryIds"
            :filtered-groups="filteredGroups"
            :group-ids.sync="filterDataByGroupIds"
          />
          <div class="d-flex">
            {{ $root.getLabel('Participant') }} Totals
            <v-chip
              v-if="relevantParticipants.length !== relevantParticipantsData.length"
              small
              color="primary"
              class="ml-3"
            >
              Top 100
            </v-chip>
          </div>
          <v-btn icon style="visibility: hidden;" />
        </v-subheader>

        <template v-if="!isInFinalCountdown">
          <div class="chartjs-size-wrapper">
            <div
              v-if="!relevantParticipantsData.length"
              class="d-flex flex-column align-center ma-auto"
            >
              <v-icon x-large>mdi-cancel</v-icon>
              No entries yet
              <div class="mt-2"><router-link :to="{ name: 'new' }">Add one</router-link></div>
            </div>
            <HorizontalBarChart
              v-else
              :chart-data="participantData"
              :chart-options="participantChartOptions"
              class="flex-shrink-0"
              :styles="{
                position: 'relative',
                height: `${Math.max(128, 24 * (relevantParticipantsData.length + 1))}px`,
              }"
            />
          </div>
        </template>
        <div v-else class="d-flex flex-column align-center text-center ma-auto pa-4">
          <h1>Almost done!</h1>
          <h3>Keep working to finish strongly 💪</h3>
          <br />
          <p v-if="endDate">
            Final results will be available once the challenge finishes on
            {{ endDate.toLocaleString() }}
          </p>
        </div>
      </v-carousel-item>
      <v-carousel-item>
        <v-subheader class="primary--text subtitle-1 justify-space-between">
          <FilterBy
            :all-groups="extendedGroups"
            :country-ids.sync="filterDataByCountryIds"
            :filtered-groups="filteredGroups"
            :group-ids.sync="filterDataByGroupIds"
            searchable
            :search-query.sync="filterDataBySearch"
          />
          <div class="d-flex">
            {{ $root.getLabel('Participant') }} Totals
          </div>
          <v-btn icon style="visibility: hidden;" />
        </v-subheader>

        <template v-if="!isInFinalCountdown">
          <v-data-table
            :headers="[
              {
                text: '#',
                value: '$rank',
              },
              {
                text: $root.getLabel('Participant'),
                value: 'name',
              },
              {
                text: $root.getLabel('Group'),
                value: '$group.name',
              },
              {
                text: $root.getLabel('Country'),
                value: '$group.country',
              },
              {
                text: 'Total',
                value: '$total',
              },
            ]"
            :items="relevantParticipants"
            :search="filterDataBySearch"
            :footer-props="{
              itemsPerPageOptions: [100],
            }"
            :class="{ 'mb-6': $vuetify.breakpoint.xsOnly }"
          >
            <template v-slot:[`item.$rank`]="{ item }">
              {{ item.$rank }}
            </template>
            <template v-slot:[`item.$group.name`]="{ item }">
              <v-avatar size="12" :color="item.$group.color" class="mr-1 mt-n1" />
              {{ item.$group.name }}
            </template>
            <template v-slot:[`item.$group.country`]="{ item }">
              {{ getName(item.$group.country) }}
            </template>
            <template v-slot:[`item.$total`]="{ item }">
              {{ item.$total.toLocaleString() }}
            </template>
          </v-data-table>
        </template>
        <div v-else class="d-flex flex-column align-center text-center ma-auto pa-4">
          <h1>Almost done!</h1>
          <h3>Keep working to finish strongly 💪</h3>
          <br />
          <p v-if="endDate">
            Final results will be available once the challenge finishes on
            {{ endDate.toLocaleString() }}
          </p>
        </div>
      </v-carousel-item>
    </v-carousel>
  </div>
</template>

<script>
import Vue from 'vue';
import { mapGetters } from 'vuex';
import get from 'lodash.get';
import orderBy from 'lodash.orderby';
import runes from 'runes';
import { idKey, findByIdKey } from '@/plugins/firebase';
import { getName } from '@/services/country';
import { isChallengeInFinalCountdown, getChallengeEndDate } from '@/services/date';
import HorizontalBarChart from '@/components/HorizontalBarChart.vue';
import FilterBy from '@/components/FilterBy.vue';
import SortBy from '@/components/SortBy.vue';

// exponentially curb values to that outliers are less prominent in chart axes
const flatten = (v) => v ** (1 / 2);
const unflatten = (v) => Math.round(v ** 2);

function getParticipantRelativeValue(value, participants, id) {
  const numGroupParticipants = participants.filter(({ groupId }) => groupId === id).length;
  return numGroupParticipants ? Math.round(value / numGroupParticipants) : 0;
}

const SI_SYMBOL = ['', 'k', 'M', 'G', 'T', 'P', 'E'];
function abbreviateNumber(number) {
  const tier = Math.log10(number) / 3 | 0; // eslint-disable-line no-bitwise
  if (!tier) return number;

  const suffix = SI_SYMBOL[tier];
  const scale = 10 ** (tier * 3);
  const scaled = number / scale;
  return `${scaled.toFixed(1)}${suffix}`;
}

function truncateLabel(label, limit = 22) {
  if (!label) return label;

  const chars = runes(label.trim());
  if (chars.length <= limit) return label; // don't trim a single character

  const truncate = (num) => chars.slice(0, num).join('').trim();
  const lastChar = chars[chars.length - 1];
  if (!/[\w\s]/.test(lastChar)) { // last char is emoji-like; preserve it in place
    return `${truncate(limit - 2)}…${lastChar}`;
  }

  return `${truncate(limit - 1)}…`;
}

export default Vue.extend({
  name: 'Statistics',
  localStorage: {
    currentSlideIndex: {
      type: Number,
    },
    filterDataByGroupIds: {
      type: Array,
    },
    filterDataByCountryIds: {
      type: Array,
    },
    filterDataBySearch: {
      type: Object, // actually String, but then `undefined` and `null` get encoded improperly
      default: '',
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
    ...mapGetters([
      'challenges',
      'groups',
      'participants',
      'currentChallenge',
    ]),

    hasMultipleGroups() {
      return this.groups.length > 1;
    },
    firstSlideIndexWithGroupFilters() {
      return this.hasMultipleGroups ? 2 : 0;
    },

    extendedGroups() {
      return this.groups
        .map((item) => {
          // eslint-disable-next-line no-param-reassign
          item.$average = getParticipantRelativeValue(
            item.$total,
            this.relevantParticipants,
            item[idKey],
          );
          return item;
        })
        .filter(({ $total }) => $total);
    },
    filteredGroups() {
      let filteredGroups = this.extendedGroups;
      if (this.filterDataByCountryIds.length) {
        filteredGroups = filteredGroups
          .filter(({ country }) => this.filterDataByCountryIds.includes(country));
      }
      return filteredGroups;
    },
    relevantGroups() {
      let relevantGroups = this.filteredGroups;
      if (this.orderDataBy) {
        relevantGroups = orderBy(relevantGroups, this.orderDataBy.keys, this.orderDataBy.dirs);
      }
      return relevantGroups;
    },

    filteredParticipants() {
      return this.participants.filter(({ $total }) => $total);
    },
    relevantParticipants() {
      let relevantParticipants = this.participants
        .filter(({ $total }) => $total);

      if (this.filterDataByCountryIds.length) {
        relevantParticipants = relevantParticipants
          .filter(({ $group }) => $group && this.filterDataByCountryIds.includes($group.country));
      }
      if (
        this.filterDataByGroupIds.length
        && this.currentSlideIndex >= this.firstSlideIndexWithGroupFilters
      ) {
        relevantParticipants = relevantParticipants
          .filter(({ $group }) => $group && this.filterDataByGroupIds.includes($group[idKey]));
      }
      // always sort by value since Top 100 on alphabetical makes no sense
      const orderDataBy = findByIdKey(this.orderDataBys, 'value');
      if (orderDataBy) {
        relevantParticipants = orderBy(relevantParticipants, orderDataBy.keys, orderDataBy.dirs);
      }
      relevantParticipants = relevantParticipants
        .map((item, index) => {
          // eslint-disable-next-line no-param-reassign
          item.$rank = index + 1;
          return item;
        });
      return relevantParticipants;
    },
    relevantParticipantsData() {
      return this.relevantParticipants.slice(0, 100);
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
          name: this.hasMultipleGroups && this.currentSlideIndex === 0 ? 'Average' : 'Total',
          keys: [this.hasMultipleGroups && this.currentSlideIndex === 0 ? '$average' : '$total'],
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
          yAxes: [{
            ticks: {
              callback: (value) => truncateLabel(value),
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
              this.relevantGroups,
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
              if (this.filterDataByGroupIds.length === 1) return null;

              const participant = this.relevantParticipantsData[index] || {};
              return participant && `${participant.$group.name}`;
            },
          },
        },
        elements: {
          rectangle: {
            backgroundColor: ({ dataIndex }) => get(
              this.relevantParticipantsData,
              `${dataIndex}.$group.color`,
              '#000000',
            ),
          },
        },
      };
    },

    groupDataPerParticipant() {
      const groupDataPerParticipant = this.gatherData(this.relevantGroups, '$average');
      // console.log(groupDataPerParticipant);
      return groupDataPerParticipant;
    },
    groupData() {
      const groupData = this.gatherData(this.relevantGroups);
      // console.log(groupData);
      return groupData;
    },
    participantData() {
      const participantData = this.gatherData(this.relevantParticipantsData);
      // console.log(participantData);
      return participantData;
    },

    isInFinalCountdown() {
      return isChallengeInFinalCountdown(this.currentChallenge);
    },
    endDate() {
      return getChallengeEndDate(this.currentChallenge);
    },
  },
  methods: {
    get,
    getName,

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
    HorizontalBarChart,
    FilterBy,
    SortBy,
  },
});
</script>

<style lang="scss">
.Statistics {
  height: 100%;

  .v-carousel {
    .v-window__container {
      // HACK: for some reason the carousel transition caused a flicker of improper styling
      &:not(.v-window__container--is-active) {
        .v-carousel__item {
          > .v-responsive__content {
            display: flex;
            flex-direction: column;
            padding-top: 48px; // for subheader
            padding-bottom: 50px; // for carousel delimeters

            > .v-subheader {
              position: fixed;
              top: calc(56px + env(safe-area-inset-top)); // for toolbar
              left: 0;
              right: 0;
              background: white;
              z-index: 1;
            }
          }
        }
      }
    }
    .v-carousel__controls {
      position: fixed;
      left: 0 !important;
      right: 0 !important;
      bottom: calc(56px + env(safe-area-inset-bottom)); // for bottom nav
    }
  }
}
</style>
