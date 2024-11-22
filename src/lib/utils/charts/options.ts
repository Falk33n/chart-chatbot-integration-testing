export const base = {
	options: {
		responsive: true
	}
};

export const barHorizontal = {
	options: {
		...base.options,
		indexAxis: 'y',
		plugins: {
			legend: {
				position: 'right'
			}
		}
	}
};

export const barStacked = {
	options: {
		...base.options,
		scales: {
			x: {
				stacked: true
			},
			y: {
				stacked: true
			}
		}
	}
};

export const barStackedGrouped = {
	options: {
		...barStacked.options,
		interaction: {
			intersect: false
		}
	}
};

export const lineSmooth = {
	options: {
		...base.options,
		interaction: {
			intersect: false
		}
	}
};

export const lineMultiAxis = {
	options: {
		...base.options,
		stacked: false,
		interaction: {
			mode: 'index',
			intersect: false
		},
		scales: {
			y: {
				type: 'linear',
				display: true,
				position: 'left'
			},
			y1: {
				type: 'linear',
				display: true,
				position: 'right',
				grid: {
					drawOnChartArea: false
				}
			}
		}
	}
};

export const lineFilled = {
	options: {
		...base.options,
		plugins: {
			filler: {
				propagate: false
			}
		},
		interaction: {
			intersect: false
		}
	}
};

export const lineStacked = {
	options: {
		...base.options,
		stacked: true,
		interaction: {
			mode: 'nearest',
			intersect: false,
			axis: 'x'
		},
		scales: {
			y: {
				stacked: true
			}
		}
	}
};
