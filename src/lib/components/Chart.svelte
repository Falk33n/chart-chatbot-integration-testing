<script lang="ts">
	import { chartConfig } from '$/lib/utils/charts';
	import { Chart, type ChartItem } from 'chart.js/auto';
	import { onMount } from 'svelte';

	onMount(() => {
		const canvasElement = document.getElementById('chartjs') as ChartItem;
		if (canvasElement) new Chart(canvasElement, chartConfig);
	});
</script>

<canvas id="chartjs" class="mx-auto size-[400px]"></canvas>
