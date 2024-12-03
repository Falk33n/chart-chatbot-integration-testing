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
			finalOptions = { ...barHorizontal.options };
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
		case 'radar':
			finalType = 'radar';
			break;
		case 'scatter':
			finalType = 'scatter';
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

function formatChartConfig(incomingData: IncomingDataType): ChartConfiguration {
	const { finalType, finalOptions } = getConfigProps(incomingData);
	const colors = createColors(
		finalType === 'doughnut' || finalType === 'pie' || finalType === 'polarArea'
			? incomingData.data.labels.length
			: incomingData.data.datasets.length
	);

	const finalDatasets: ChartConfiguration['data']['datasets'] =
		incomingData.data.datasets.map((dataset, i) => {
			let transformedData;

			if (finalType === 'bubble' || finalType === 'scatter') {
				transformedData = dataset.data.map((point) => {
					if (typeof point === 'object' && 'x' in point && 'y' in point) {
						return finalType === 'scatter'
							? { x: point.x, y: point.y, r: 3 }
							: point;
					} else if (typeof point === 'number') {
						throw new Error(`Invalid data point: ${JSON.stringify(point)}`);
					}
					throw new Error(`Invalid data point: ${JSON.stringify(point)}`);
				});
			} else {
				transformedData = dataset.data;
			}

			return {
				...(finalType !== 'line' && {
					borderSkipped: false,
					borderWidth: 2
				}),

				...(finalType === 'line' && {
					pointRadius: 8,
					pointBackgroundColor: '#FFFFFF',
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

export function isValidChartConfig(data: any): data is IncomingDataType {
	if (typeof data !== 'object' || data === null) return false;
	return (
		typeof data.type === 'string' &&
		Array.isArray(data.data.labels) &&
		data.data.labels.every((label: any) => typeof label === 'string') &&
		Array.isArray(data.data.datasets) &&
		data.data.datasets.every(
			(dataset: any) =>
				typeof dataset.label === 'string' &&
				Array.isArray(dataset.data) &&
				dataset.data.every(
					(value: any) =>
						typeof value === 'number' ||
						(Array.isArray(value) &&
							value.length === 2 &&
							typeof value[0] === 'number' &&
							typeof value[1] === 'number') ||
						(typeof value === 'object' &&
							'x' in value &&
							typeof value.x === 'number' &&
							'y' in value &&
							typeof value.y === 'number' &&
							'r' in value &&
							typeof value.r === 'number')
				)
		)
	);
}

/* const mockData: IncomingDataType = {
	type: 'scatter',
	data: {
		labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
		datasets: [
			{
				label: 'Deaths',
				data: [
					{
						x: 3,
						y: 5,
						r: 3
					},
					{
						x: 10,
						y: 15,
						r: 13
					}
				]
			},
			{
				label: 'Dessss',
				data: [
					{
						x: 12,
						y: 20,
						r: 17
					},
					{
						x: 5,
						y: 18,
						r: 25
					}
				]
			},
			{
				label: 'hoho',
				data: [
					{
						x: 33,
						y: 35,
						r: 31
					},
					{
						x: 14,
						y: 29,
						r: 37
					}
				]
			}
		]
	}
};
 */
export function createChartConfig(data: IncomingDataType) {
	return formatChartConfig(data);
}
