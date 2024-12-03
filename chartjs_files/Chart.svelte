<script lang="ts">
	import type { IncomingDataType } from '$/lib/types';
	import { createChartConfig } from '$/lib/utils/charts';
	import { Chart, type ChartItem } from 'chart.js/auto';

	let { data, id }: { data: IncomingDataType; id: number } = $props();

	$effect(() => {
		const snapshotData = $state.snapshot(data) as IncomingDataType;
		const canvasElement = document.getElementById(`chartjs-${id}`) as ChartItem;
		if (canvasElement)
			new Chart(canvasElement, createChartConfig(snapshotData));
	});
</script>

<canvas id={`chartjs-${id}`} class="mx-auto max-h-[500px] w-full py-4"></canvas>
