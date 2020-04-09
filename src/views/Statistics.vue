<template>
  <div class="Statistics flex-page">
    <Loader v-if="loading" class="ma-auto" />
    <div v-else-if="!relevantParticipants.length" class="d-flex flex-column align-center ma-auto">
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
      <v-carousel-item>
        <v-subheader class="primary--text subtitle-1 justify-space-between">
          <FilterBy :groups="relevantGroups" :country-ids.sync="filterDataByCountryIds" />
          {{ $root.labels.Group }} Totals
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

        <div class="chartjs-size-wrapper">
          <div
            v-if="!relevantParticipants.length"
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
              height: `${Math.max(128, 24 * (relevantParticipants.length + 1))}px`,
            }"
          />
        </div>
      </v-carousel-item>
    </v-carousel>
  </div>
</template>

<script>
import Vue from 'vue';
import { mapGetters, mapActions } from 'vuex';
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

export default Vue.extend({
  name: 'Statistics',
  props: {
    challengeId: String,
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
      loading: true,
    };
  },
  watch: {
    currentChallengeId: {
      async handler() {
        this.loading = true;
        await Promise.all([
          this.groupsPromise,
          this.participantsPromise,
        ]);
        this.loading = false;
      },
      immediate: true,
    },

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
    ]),

    currentChallengeId() {
      const challenge = this.challenges.find(({ [idKey]: id }) => id === this.challengeId);
      return challenge && challenge[idKey];
    },

    groupsPromise() {
      return this.bindGroups({
        mutateQuery: this.currentChallengeId
          ? (query) => query.where('challengeId', '==', this.currentChallengeId)
          : undefined,
      });
    },
    participantsPromise() {
      return this.bindParticipants({
        mutateQuery: this.currentChallengeId
          ? (query) => query.where('challengeId', '==', this.currentChallengeId)
          : undefined,
      });
    },

    relevantGroups() {
      let groupsWithValues = this.groups
        .map((item) => {
          // eslint-disable-next-line no-param-reassign
          item.$name = `${item.name}${item.country ? ` ${getEmojiFlag(item.country)}` : ''}`;
          // eslint-disable-next-line no-param-reassign
          item.$average = getParticipantRelativeValue(
            item.$total,
            this.relevantParticipants,
            item[idKey],
          );
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
    relevantParticipants() {
      let participantsWithValues = this.participants
        .map((item) => {
          // eslint-disable-next-line no-param-reassign
          item.$group = findByIdKey(this.groups, item.groupId);
          // eslint-disable-next-line no-param-reassign
          item.$name = item.$group && item.$group.country
            ? `${item.name} ${getEmojiFlag(item.$group.country)}`
            : item.name;
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
              if (!this.filterDataByGroupIds.length) return null;

              const participant = this.relevantParticipants[index] || {};
              return participant && `${participant.$group.name}`;
            },
          },
        },
        elements: {
          rectangle: {
            backgroundColor: ({ dataIndex }) => get(
              this.relevantParticipants,
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
      const participantData = this.gatherData(this.relevantParticipants);
      // console.log(participantData);
      return participantData;
    },
  },
  methods: {
    get,
    ...mapActions([
      'bindGroups',
      'bindParticipants',
    ]),

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
    .v-carousel__controls {
      position: fixed;
      left: 0 !important;
      right: 0 !important;
      bottom: calc(56px + env(safe-area-inset-bottom)); // for bottom nav
    }
  }
}
</style>
