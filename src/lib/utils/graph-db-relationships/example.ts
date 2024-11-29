/* 	type Node = {
		id: string; // Unique identifier
		type: string; // Either 'user' or 'other'
		radius?: number; // Dynamically calculated radius
		x?: number; // X-coordinate (updated by simulation)
		y?: number; // Y-coordinate (updated by simulation)
		vx?: number; // Velocity in x-direction (used by simulation)
		vy?: number; // Velocity in y-direction (used by simulation)
	};

	type Link = {
		source: string | Node; // Source node (ID or Node object)
		target: string | Node; // Target node (ID or Node object)
		label: string; // Metadata for the link
	};

	onMount(() => {
		const myData = {
			nodes: [
				{ id: 'A', type: 'user' },
				{ id: 'B', type: 'user' },
				{ id: 'C', type: 'other' },
				{ id: 'D', type: 'other' }
			],
			links: [
				{ source: 'A', target: 'D', label: 'LIKES' },
				{ source: 'B', target: 'D', label: 'LIKES_ALOT' },
				{
					source: 'C',
					target: 'D',
					label: 'DOES_NOT_LIKE'
				},
				{ source: 'D', target: 'A', label: 'HATES' }
			]
		};

		const margin = { top: 10, right: 30, bottom: 30, left: 40 },
			width = 400 - margin.left - margin.right,
			height = 400 - margin.top - margin.bottom;

		const svg = d3
			.select('#my_dataviz')
			.append('svg')
			.attr('width', width + margin.left + margin.right)
			.attr('height', height + margin.top + margin.bottom)
			.append('g')
			.attr('transform', `translate(${margin.left}, ${margin.top})`);

		svg
			.append('defs')
			.append('marker')
			.attr('id', 'arrowhead')
			.attr('viewBox', '0 -5 10 10') // Viewbox for the marker
			.attr('refX', 10) // Position of the arrow tip
			.attr('refY', 0) // Center vertically
			.attr('markerWidth', 6)
			.attr('markerHeight', 6)
			.attr('orient', 'auto') // Rotate arrow automatically
			.append('path')
			.attr('d', 'M0,-5L10,0L0,5') // Shape of the arrow
			.attr('fill', '#a5a5a5');

		const link = svg
			.selectAll('line')
			.data(myData.links)
			.join('line')
			.style('stroke', '#a5a5a5')
			.style('stroke-width', 2)
			.attr('marker-end', 'url(#arrowhead)'); // Add the arrowhead

		// Create label groups (g) for each link
		const linkLabels = svg
			.selectAll('g.link-label')
			.data(myData.links)
			.join('g')
			.attr('class', 'link-label');

		// Add rect for background
		linkLabels
			.append('rect')
			.attr('fill', '#fff') // Background color
			.attr('rx', 4) // Rounded corners
			.attr('ry', 4);

		// Add text for the label
		linkLabels
			.append('text')
			.attr('font-size', '12px')
			.attr('fill', '#000')
			.attr('stroke', '#4d4d4d')
			.attr('dy', '0.35em')
			.attr('text-anchor', 'middle') // Center text
			.text((d) => d.label);

		const node = svg
			.selectAll('g.node')
			.data(myData.nodes)
			.join('g')
			.attr('class', 'node');

		// Add text labels to the node groups
		node
			.append('text')
			.text((d) => d.id)
			.attr('text-anchor', 'middle') // Center text horizontally
			.attr('dy', '0.35em') // Center text vertically
			.style('font-size', '12px')
			.style('fill', '#FFF')
			.style('stroke', '#ebebeb');

		// Adjust the radius of the circle based on label width
		node.each(function (d: any) {
			const text = d3.select(this).select('text');
			const bbox = text.node().getBBox();
			const padding = 10; // Add padding around the label

			d.radius = Math.max(20, bbox.width / 2 + padding); // Ensure minimum radius of 20
		});

		node
			.append('circle')
			.attr('r', (d: any) => d.radius)
			.style('fill', (d) => (d.type === 'user' ? '#4682B4' : '#69b3a2')); // Blue for user, green for others

		node.selectAll('text').raise();

		d3.forceSimulation(myData.nodes)
			.force(
				'link',
				d3
					.forceLink()
					.id((d: any) => d.id)
					.links(myData.links)
					.distance((d: any) => {
						// Calculate the total distance needed between the centers
						const sourceRadius = d.source.radius || 20;
						const targetRadius = d.target.radius || 20;
						const baseDistance = 140; // Minimum distance between the edges
						return sourceRadius + targetRadius + baseDistance;
					})
			)
			.force('charge', d3.forceManyBody().strength(-400))
			.force('center', d3.forceCenter(width / 2, height / 2))
			.on('tick', ticked);

		function ticked() {
			link
				.attr('x1', (d: Link) => {
					const source = d.source as Node;
					const target = d.target as Node;

					if (source.x && source.y && target.x && target.y && source.radius) {
						const dx = target.x - source.x;
						const dy = target.y - source.y;
						const distance = Math.sqrt(dx * dx + dy * dy);
						const sourceRadius = source.radius;
						return source.x + (dx / distance) * sourceRadius;
					}

					return 0;
				})
				.attr('y1', (d: Link) => {
					const source = d.source as Node;
					const target = d.target as Node;

					if (source.x && source.y && target.x && target.y && source.radius) {
						const dx = target.x - source.x;
						const dy = target.y - source.y;
						const distance = Math.sqrt(dx * dx + dy * dy);
						const sourceRadius = source.radius;
						return source.y + (dy / distance) * sourceRadius;
					}

					return 0;
				})
				.attr('x2', (d: any) => {
					const dx = d.source.x - d.target.x;
					const dy = d.source.y - d.target.y;
					const distance = Math.sqrt(dx * dx + dy * dy);
					const targetRadius = d.target.radius || 20;
					return d.target.x + (dx / distance) * targetRadius;
				})
				.attr('y2', (d: any) => {
					const dx = d.source.x - d.target.x;
					const dy = d.source.y - d.target.y;
					const distance = Math.sqrt(dx * dx + dy * dy);
					const targetRadius = d.target.radius || 20;
					return d.target.y + (dy / distance) * targetRadius;
				});

			linkLabels.each(function (d: any) {
				const group = d3.select(this);
				const midX = (d.source.x + d.target.x) / 2;
				const midY = (d.source.y + d.target.y) / 2;
				const text = group.select('text');
				const bbox = (text.node() as SVGGraphicsElement)?.getBBox();
				const angle =
					Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x) *
					(180 / Math.PI);

				group
					.attr('transform', `translate(${midX}, ${midY}) rotate(${angle})`)
					.select('rect')
					.attr('x', bbox.x - 4)
					.attr('y', bbox.y - 2)
					.attr('width', bbox.width + 8)
					.attr('height', bbox.height + 4);
			});

			node.attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);
		}
	}); 
  
  
  
  
  	<div id="my_dataviz"></div>
*/
