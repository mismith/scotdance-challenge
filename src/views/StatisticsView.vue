<script setup lang="ts">
import { StorageSerializers, useLocalStorage } from '@vueuse/core'
import type { ChartData, ChartOptions } from 'chart.js'
import { computed, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { type GroupItem, type ParticipantItem, useAppStore } from '@/stores/app'
import FilterBy from '@/components/FilterBy.vue'
import HorizontalBarChart from '@/components/HorizontalBarChart.vue'
import SortBy, { type SortOption } from '@/components/SortBy.vue'
import { abbreviateNumber, flatten, truncateLabel, unflatten } from '@/lib/charts'
import { getName } from '@/lib/country'
import { getChallengeEndDate, isChallengeInFinalCountdown } from '@/lib/date'
import { findById } from '@/lib/firebase'
import { orderBy } from '@/lib/utils'

interface GroupStats extends GroupItem {
  $average: number
}
interface ParticipantStats extends ParticipantItem {
  $rank: number
}

const store = useAppStore()
const { xs } = useDisplay()

// same keys as the old vue-localstorage settings, so preferences carry over
const storageKey = (key: string) => `scotdance-challenge.${key}`
const currentSlideIndex = useLocalStorage(storageKey('currentSlideIndex'), 0)
const filterDataByGroupIds = useLocalStorage<string[]>(storageKey('filterDataByGroupIds'), [])
const filterDataByCountryIds = useLocalStorage<string[]>(storageKey('filterDataByCountryIds'), [])
const filterDataBySearch = useLocalStorage<string | null>(storageKey('filterDataBySearch'), '', {
  serializer: StorageSerializers.object,
})
const orderDataById = useLocalStorage(storageKey('orderDataById'), 'name')

const hasMultipleGroups = computed(() => store.groups.length > 1)
const firstSlideIndexWithGroupFilters = computed(() => (hasMultipleGroups.value ? 2 : 0))

const participantsWithEntries = computed(() => store.participants.filter(({ $total }) => $total))

const relevantParticipants = computed<ParticipantStats[]>(() => {
  let participants = participantsWithEntries.value
  if (filterDataByCountryIds.value.length) {
    participants = participants.filter(
      ({ $group }) => $group?.country && filterDataByCountryIds.value.includes($group.country),
    )
  }
  if (
    filterDataByGroupIds.value.length &&
    currentSlideIndex.value >= firstSlideIndexWithGroupFilters.value
  ) {
    participants = participants.filter(
      ({ $group }) => $group && filterDataByGroupIds.value.includes($group.id),
    )
  }
  // always rank by value since a Top 100 by name makes no sense
  return orderBy(participants, ['$total'], ['desc']).map((item, index) => ({
    ...item,
    $rank: index + 1,
  }))
})
const relevantParticipantsData = computed(() => relevantParticipants.value.slice(0, 100))

const extendedGroups = computed<GroupStats[]>(() =>
  store.groups
    .filter(({ $total }) => $total)
    .map((group) => {
      const count = relevantParticipants.value.filter(({ groupId }) => groupId === group.id).length
      return { ...group, $average: count ? Math.round((group.$total ?? 0) / count) : 0 }
    }),
)
const filteredGroups = computed(() =>
  filterDataByCountryIds.value.length
    ? extendedGroups.value.filter(
        ({ country }) => country && filterDataByCountryIds.value.includes(country),
      )
    : extendedGroups.value,
)

const isAverageSlide = computed(() => hasMultipleGroups.value && currentSlideIndex.value === 0)
const orderDataBys = computed<SortOption[]>(() => [
  { id: 'name', name: 'Name', keys: ['name'] },
  {
    id: 'value',
    name: isAverageSlide.value ? 'Average' : 'Total',
    keys: [isAverageSlide.value ? '$average' : '$total'],
    dirs: ['desc'],
  },
])
const orderDataBy = computed(() => findById(orderDataBys.value, orderDataById.value))
watch(
  orderDataBys,
  (options) => {
    if (!findById(options, orderDataById.value)) orderDataById.value = options[0]!.id
  },
  { immediate: true },
)

const relevantGroups = computed(() =>
  orderDataBy.value
    ? orderBy(filteredGroups.value, orderDataBy.value.keys, orderDataBy.value.dirs)
    : filteredGroups.value,
)

function gatherData<T extends { name: string; $name?: string }>(
  items: T[],
  getValue: (item: T) => number,
  getColor: (item: T) => string | undefined,
): ChartData<'bar'> {
  return {
    labels: items.map(({ name, $name }) => $name || name),
    datasets: [
      {
        data: items.map((item) => flatten(getValue(item))),
        backgroundColor: items.map((item) => getColor(item) || '#000000'),
      },
    ],
  }
}
const groupAverageData = computed(() =>
  gatherData(
    relevantGroups.value,
    (group) => group.$average,
    (group) => group.color,
  ),
)
const groupTotalData = computed(() =>
  gatherData(
    relevantGroups.value,
    (group) => group.$total ?? 0,
    (group) => group.color,
  ),
)
const participantData = computed(() =>
  gatherData(
    relevantParticipantsData.value,
    (participant) => participant.$total ?? 0,
    (participant) => participant.$group?.color,
  ),
)

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  scales: {
    x: {
      beginAtZero: true,
      min: 0,
      ticks: { callback: (value) => abbreviateNumber(unflatten(Number(value))) },
    },
    y: {
      ticks: {
        callback(value) {
          return truncateLabel(String(this.getLabelForValue(Number(value))))
        },
      },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: ({ parsed }) => unflatten(parsed.x ?? 0).toLocaleString(),
        title: ([item]) =>
          item && orderDataBy.value?.id === 'value'
            ? `${item.label} [${item.dataIndex + 1}]`
            : (item?.label ?? ''),
      },
    },
  },
}))
const participantChartOptions = computed<ChartOptions<'bar'>>(() => ({
  ...chartOptions.value,
  plugins: {
    ...chartOptions.value.plugins,
    tooltip: {
      callbacks: {
        ...chartOptions.value.plugins?.tooltip?.callbacks,
        afterTitle: ([item]) => {
          if (!item || filterDataByGroupIds.value.length === 1) return ''
          return relevantParticipantsData.value[item.dataIndex]?.$group?.name ?? ''
        },
      },
    },
  },
}))

const chartHeight = (count: number) => Math.max(128, 24 * (count + 1))

const tableHeaders = computed(() => [
  { title: '#', key: '$rank' },
  { title: store.label('Participant'), key: 'name' },
  { title: store.label('Group'), key: '$group.name' },
  { title: store.label('Country'), key: '$group.country' },
  { title: 'Total', key: '$total' },
])

const isInFinalCountdown = computed(() => isChallengeInFinalCountdown(store.currentChallenge))
const endDate = computed(() => getChallengeEndDate(store.currentChallenge))
</script>

<template>
  <div class="StatisticsView flex-page">
    <div v-if="!store.currentChallenge" class="d-flex flex-column align-center ma-auto">
      <v-icon size="x-large" class="mb-3">mdi-chevron-up</v-icon>
      Select a {{ store.label('Challenge').toLowerCase() }} first
    </div>
    <div
      v-else-if="!participantsWithEntries.length"
      class="d-flex flex-column align-center ma-auto"
    >
      <v-icon size="x-large">mdi-cancel</v-icon>
      No entries yet
      <div class="mt-2"><router-link :to="{ name: 'new' }">Add one</router-link></div>
    </div>
    <v-carousel
      v-else
      v-model="currentSlideIndex"
      :show-arrows="false"
      hide-delimiter-background
      height="100%"
      class="StatisticsView__carousel"
    >
      <v-carousel-item v-if="hasMultipleGroups">
        <div class="StatisticsView__slide">
          <header class="StatisticsView__header">
            <FilterBy v-model:country-ids="filterDataByCountryIds" :all-groups="extendedGroups" />
            <h2>{{ store.label('Group') }} Averages</h2>
            <SortBy v-model="orderDataById" :items="orderDataBys" />
          </header>
          <HorizontalBarChart
            :data="groupAverageData"
            :options="chartOptions"
            :height="chartHeight(relevantGroups.length)"
          />
        </div>
      </v-carousel-item>
      <v-carousel-item v-if="hasMultipleGroups">
        <div class="StatisticsView__slide">
          <header class="StatisticsView__header">
            <FilterBy v-model:country-ids="filterDataByCountryIds" :all-groups="extendedGroups" />
            <h2>{{ store.label('Group') }} Totals</h2>
            <SortBy v-model="orderDataById" :items="orderDataBys" />
          </header>
          <HorizontalBarChart
            :data="groupTotalData"
            :options="chartOptions"
            :height="chartHeight(relevantGroups.length)"
          />
        </div>
      </v-carousel-item>
      <v-carousel-item>
        <div class="StatisticsView__slide">
          <header class="StatisticsView__header">
            <FilterBy
              v-model:country-ids="filterDataByCountryIds"
              v-model:group-ids="filterDataByGroupIds"
              :all-groups="extendedGroups"
              :filtered-groups="filteredGroups"
            />
            <h2 class="d-flex align-center">
              {{ store.label('Participant') }} Totals
              <v-chip
                v-if="relevantParticipants.length !== relevantParticipantsData.length"
                size="small"
                color="primary"
                variant="flat"
                class="ml-3"
              >
                Top 100
              </v-chip>
            </h2>
            <v-btn icon variant="text" style="visibility: hidden" />
          </header>

          <template v-if="!isInFinalCountdown">
            <div
              v-if="!relevantParticipantsData.length"
              class="d-flex flex-column align-center ma-auto"
            >
              <v-icon size="x-large">mdi-cancel</v-icon>
              No entries yet
              <div class="mt-2"><router-link :to="{ name: 'new' }">Add one</router-link></div>
            </div>
            <HorizontalBarChart
              v-else
              :data="participantData"
              :options="participantChartOptions"
              :height="chartHeight(relevantParticipantsData.length)"
            />
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
        </div>
      </v-carousel-item>
      <v-carousel-item>
        <div class="StatisticsView__slide">
          <header class="StatisticsView__header">
            <FilterBy
              v-model:country-ids="filterDataByCountryIds"
              v-model:group-ids="filterDataByGroupIds"
              v-model:search-query="filterDataBySearch"
              :all-groups="extendedGroups"
              :filtered-groups="filteredGroups"
              searchable
            />
            <h2>{{ store.label('Participant') }} Totals</h2>
            <v-btn icon variant="text" style="visibility: hidden" />
          </header>

          <v-data-table
            v-if="!isInFinalCountdown"
            :headers="tableHeaders"
            :items="relevantParticipants"
            :search="filterDataBySearch ?? undefined"
            :items-per-page="100"
            :items-per-page-options="[100]"
            :class="{ 'mb-6': xs }"
          >
            <template #[`item.$group.name`]="{ item }">
              <v-avatar size="12" :color="item.$group?.color" class="mr-1 mt-n1" />
              {{ item.$group?.name }}
            </template>
            <template #[`item.$group.country`]="{ item }">
              {{ getName(item.$group?.country) }}
            </template>
            <template #[`item.$total`]="{ item }">
              {{ item.$total?.toLocaleString() }}
            </template>
          </v-data-table>
          <div v-else class="d-flex flex-column align-center text-center ma-auto pa-4">
            <h1>Almost done!</h1>
            <h3>Keep working to finish strongly 💪</h3>
            <br />
            <p v-if="endDate">
              Final results will be available once the challenge finishes on
              {{ endDate.toLocaleString() }}
            </p>
          </div>
        </div>
      </v-carousel-item>
    </v-carousel>
  </div>
</template>

<style>
.StatisticsView {
  /* fill the space between the app bar and bottom nav, scrolling each slide within */
  height: calc(100dvh - var(--v-layout-top, 56px) - var(--v-layout-bottom, 56px));

  .StatisticsView__carousel .v-responsive__content {
    height: 100%;
  }

  /* grey delimiters, as on Vuetify 2's light carousel */
  .v-carousel__controls {
    color: rgba(0, 0, 0, 0.38);
  }

  .StatisticsView__slide {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
    padding-bottom: 50px; /* for carousel delimiters */
  }

  .StatisticsView__header {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
    min-height: 48px;
    padding: 0 4px;
    background: rgb(var(--v-theme-surface));
    color: rgb(var(--v-theme-primary));

    h2 {
      font-size: 1rem;
      font-weight: 400;
    }
  }
}
</style>
