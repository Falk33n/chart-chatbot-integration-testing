export type IncomingDataType = {
	type:
		| 'barVertical'
		| 'barHorizontal'
		| 'barStacked'
		| 'barStackedGrouped'
		| 'lineSharp'
		| 'lineSmooth'
		| 'lineMultiAxis'
		| 'lineFillStart'
		| 'lineFillEnd'
		| 'lineStacked'
		| 'bubble'
		| 'doughnut'
		| 'pie'
		| 'polarArea';
	data: {
		labels: string[];
		datasets: {
			label: string;
			/** Total length of the `data` array should be equal to or less than the length of the `labels` array  */
			data:
				| number[]
				| [number, number][]
				/** Only used for type `bubble` */
				| { x: number; y: number; r: number }[];
		}[];
	};
};
