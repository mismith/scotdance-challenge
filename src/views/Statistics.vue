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
            placeholder="Overall"
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
            :chart-options="{
              ...chartOptions,
              scales: {
                ...chartOptions.scales,
                xAxes: [{
                  ...chartOptions.scales.xAxes[0],
                  ticks: {
                    ...chartOptions.scales.xAxes[0].ticks,
                    callback: (value) => Math.round(value ** 2).toLocaleString(),
                  },
                }],
              },
              tooltips: {
                ...chartOptions.tooltips,
                callbacks: {
                  afterTitle: ([{ index }]) => {
                    if (currentGroup) return null;

                    const participant = participantsInCurrentGroup[index] || {};
                    return participant && `(${participant.$group.name})`;
                  },
                  // un-'flatten' value
                  label: ({ xLabel }) => Math.round(xLabel ** 2).toLocaleString(),
                },
              },
              elements: {
                rectangle: {
                  backgroundColor: ({ dataIndex }) => get(
                    participantsInCurrentGroup,
                    `${dataIndex}.$group.color`,
                  ),
                },
              },
            }"
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
    loading: Boolean,
  },
  localStorage: {
    currentSlide: {
      type: Number,
    },
    currentGroupId: {
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
  computed: {
    currentGroup() {
      return findByIdKey(this.groups, this.currentGroupId);
    },
    groupedParticipants() {
      return orderBy(this.participants, ['$group.name', 'name']);
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
