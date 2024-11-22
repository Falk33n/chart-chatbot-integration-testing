import type { IncomingDataType } from '$/lib/types';
import {
	barHorizontal,
	barStacked,
	barStackedGrouped,
	base,
	lineFilled,
	lineMultiAxis,
	lineSmooth,
	lineStacked
} from '$/lib/utils/charts';
import type { ChartConfiguration } from 'chart.js';

function getConfigProps(incomingData: IncomingDataType) {
	let finalType: ChartConfiguration['type'] = 'bar';
	let finalOptions = {
		...base.options
	};

	switch (incomingData.type) {
		case 'barHorizontal':
			finalOptions = {
				...barHorizontal.options
			};
			break;
		case 'barStacked':
			finalOptions = {
				...barStacked.options
			};
			break;
		case 'barStackedGrouped':
			finalOptions = {
				...barStackedGrouped.options
			};
			break;
		case 'lineSharp':
			finalType = 'line';
			break;
		case 'lineSmooth':
			finalType = 'line';
			finalOptions = {
				...lineSmooth.options
			};
			break;
		case 'lineMultiAxis':
			finalType = 'line';
			finalOptions = {
				...lineMultiAxis.options
			};
			break;
		case 'lineFillStart':
			finalType = 'line';
			finalOptions = {
				...lineFilled.options
			};
			break;
		case 'lineFillEnd':
			finalType = 'line';
			finalOptions = {
				...lineFilled.options
			};
			break;
		case 'lineStacked':
			finalType = 'line';
			finalOptions = {
				...lineStacked.options
			};
			break;
		case 'bubble':
			finalType = 'bubble';
			break;
		case 'doughnut':
			finalType = 'doughnut';
			break;
		case 'pie':
			finalType = 'pie';
			break;
		case 'polarArea':
			finalType = 'polarArea';
			break;
	}

	return { finalType, finalOptions };
}

function createColors(amount: number) {
	const colors: string[] = [];
	while (colors.length < amount) {
		const color = `#${Math.floor(
			Math.random() * 16777216 /* 256 ^ 3 = amount of unique colors available */
		)
			.toString(16)
			.padStart(6, '0')}`;
		if (!colors.includes(color)) {
			colors.push(color);
		}
	}
	return colors;
}

function createChartConfig(incomingData: IncomingDataType): ChartConfiguration {
	const { finalType, finalOptions } = getConfigProps(incomingData);
	const colors = createColors(
		finalType === 'doughnut' || finalType === 'pie' || finalType === 'polarArea'
			? incomingData.data.labels.length
			: incomingData.data.datasets.length
	);

	const finalDatasets: ChartConfiguration['data']['datasets'] =
		incomingData.data.datasets.map((dataset, i) => {
			let transformedData;

			if (finalType === 'bubble') {
				transformedData = dataset.data.map((point) => {
					if (
						typeof point === 'object' &&
						'x' in point &&
						'y' in point &&
						'r' in point
					) {
						return point;
					} else if (Array.isArray(point) && point.length === 2) {
						return { x: point[0], y: point[1], r: 5 };
					} else if (typeof point === 'number') {
						return { x: point, y: 0, r: 5 };
					}
					throw new Error(
						`Invalid bubble data point: ${JSON.stringify(point)}`
					);
				});
			} else {
				transformedData = dataset.data;
			}

			return {
				...(finalType !== 'line' && {
					borderRadius: 5,
					borderSkipped: false,
					borderWidth: 2
				}),

				...(finalType === 'line' && {
					pointRadius: 8,
					pointBackgroundColor: '#CCCCCC',
					pointHoverRadius: 12
				}),

				...(incomingData.type === 'lineSmooth' && {
					cubicInterpolationMode: 'monotone',
					tension: 0.5
				}),

				...(incomingData.type === 'lineMultiAxis' && {
					yAxisID: i === 0 ? 'y' : 'y1'
				}),

				...(incomingData.type === 'lineFillStart' && { fill: 'start' }),

				...(incomingData.type === 'lineFillEnd' && { fill: 'end' }),

				...dataset,

				data: transformedData,

				backgroundColor:
					finalType === 'doughnut' ||
					finalType === 'pie' ||
					finalType === 'polarArea'
						? colors.map((color) => `${color}B3`) // 70% opacity
						: `${colors[i]}B3`, // 70% opacity

				borderColor:
					finalType === 'doughnut' ||
					finalType === 'pie' ||
					finalType === 'polarArea'
						? colors
						: `${colors[i]}`,

				...((finalType === 'doughnut' ||
					finalType === 'pie' ||
					finalType === 'polarArea') && {
					offset: 15,
					hoverOffset: 20
				})
			};
		});

	return {
		type: finalType,
		data: {
			labels: incomingData.data.labels,
			datasets: finalDatasets
		},
		options: finalOptions
	};
}

const mockData: IncomingDataType = {
	type: 'polarArea',
	data: {
		labels: ['January', 'February', 'March'],
		datasets: [
			{
				label: 'Deaths',
				data: [10, 40, 10]
			}
		]
	}
};

export const chartConfig = createChartConfig(mockData);
