<script setup lang="ts">
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  type ChartData,
  type ChartOptions,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { Bar } from 'vue-chartjs'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

defineProps<{ data: ChartData<'bar'>; options: ChartOptions<'bar'>; height: number }>()
</script>

<template>
  <div class="flex-shrink-0" :style="{ position: 'relative', height: `${height}px` }">
    <Bar :data="data" :options="options" />
  </div>
</template>
