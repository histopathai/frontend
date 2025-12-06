<template>
  <div class="card shadow-lg rounded-xl">
    <div class="card-header">
      <h4 class="text-lg font-medium text-gray-900">Kullanıcı Kayıtları (Son 7 Gün)</h4>
    </div>
    <div class="card-body p-6">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'vue-chartjs';
import type { PropType } from 'vue';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

defineProps({
  chartData: {
    type: Object as PropType<{ labels: string[]; datasets: any[] }>,
    required: true,
  },
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 1,
      },
    },
  },
};
</script>
