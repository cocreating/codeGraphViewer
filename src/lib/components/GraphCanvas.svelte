<script>
	import { onDestroy, untrack } from 'svelte';
	import * as d3 from 'd3';
	import { gsap } from 'gsap';

	let {
		graphData = { nodes: [], edges: [] },
		selectedNode = null,
		focusMode = 'related',
		onSelectNode,
		onHelpKey = null,
		helpModeActive = $bindable(false),
		activeHelpKey = $bindable(null)
	} = $props();

	let container = $state(null);
	let canvas = $state(null);

	// Search states
	let searchQuery = $state('');
	let searchFocused = $state(false);

	// Derived search matches (Svelte 5 run-time filter)
	let searchMatches = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query || !graphData.nodes) return [];
		return graphData.nodes.filter(node => {
			const searchable = [
				node.name,
				node.id,
				node.type,
				node.role,
				node.language,
				node.riskLevel,
				...(node.analysis?.imports || []),
				...(node.analysis?.exports || []),
				...(node.analysis?.endpoints || [])
			].filter(Boolean).join(' ').toLowerCase();
			return searchable.includes(query);
		}).slice(0, 10);
	});

	const handleSelectMatch = (match) => {
		onSelectNode(match);
		searchQuery = '';
	};

	const getDotClass = (type) => {
		if (type === 'directory') return 'dot-dir';
		if (type === 'root') return 'dot-root';
		if (type === 'file') return 'dot-file';
		if (type === 'package') return 'dot-pkg';
		return `dot-${type}`;
	};

	// Heatmap states
	let heatmapMetric = $state('none');
	let colorMode = $state('type'); // 'type', 'role', 'risk'
	let layoutMode = $state('2d'); // '2d', '3d_tower', '3d_sphere', '3d_cylinder'

	const roleColors = {
		root: '#ffffff',
		folder: '#64748b',
		source: '#3b82f6',
		components: '#8b5cf6',
		routing: '#06b6d4',
		api: '#f97316',
		config: '#f59e0b',
		styles: '#ec4899',
		docs: '#22c55e',
		tests: '#84cc16',
		assets: '#14b8a6'
	};

	const roleLegend = [
		['components', 'Components'],
		['routing', 'Routing'],
		['api', 'API'],
		['config', 'Config'],
		['styles', 'Styles'],
		['docs', 'Docs'],
		['tests', 'Tests'],
		['source', 'Source']
	];

	const riskColors = {
		high: '#ef4444',
		medium: '#f97316',
		low: '#22c55e'
	};

	// Fibonacci Sphere Coordinate Generator
	const getSphericalPos = (index, total) => {
		const w = width > 0 ? width : 800;
		const h = height > 0 ? height : 600;
		const R = Math.min(w, h) * 0.32;

		if (total <= 1) return { tx: w / 2, ty: h / 2, tz: 0 };

		const y = 1 - (index / (total - 1)) * 2;
		const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));

		const goldenAngle = Math.PI * (3 - Math.sqrt(5));
		const angle = goldenAngle * index;

		return {
			tx: w / 2 + R * Math.cos(angle) * radiusAtY,
			ty: h / 2 + R * y,
			tz: R * Math.sin(angle) * radiusAtY
		};
	};

	// Cylindrical Spiral Coordinate Generator
	const getCylindricalPos = (index, total) => {
		const w = width > 0 ? width : 800;
		const h = height > 0 ? height : 600;
		const R = Math.min(w, h) * 0.28;
		const H = Math.min(w, h) * 0.55;

		if (total <= 1) return { tx: w / 2, ty: h / 2, tz: 0 };

		const heightPercent = index / (total - 1);
		const angle = index * 0.42;

		return {
			tx: w / 2 + R * Math.cos(angle),
			ty: h / 2 + (heightPercent - 0.5) * H,
			tz: R * Math.sin(angle)
		};
	};

	// Helper score formula
	const getCompositeScore = (node) => {
		if (node.type !== 'file') return 0;
		const sizeScore = (node.size || 0) / 200;
		const importsScore = (node.analysis?.importsCount || 0) * 5;
		const classesScore = (node.analysis?.classesCount || 0) * 10;
		return sizeScore + importsScore + classesScore;
	};

	// Derived metrics maximums (bulletproof reductions)
	let fileNodes = $derived(graphData.nodes ? graphData.nodes.filter(n => n.type === 'file') : []);
	let maxFileSize = $derived(fileNodes.length > 0 ? fileNodes.reduce((max, n) => Math.max(max, n.size || 0), 1) : 1);
	let maxDepth = $derived(graphData.nodes ? graphData.nodes.reduce((max, n) => Math.max(max, n.id ? n.id.split('/').length - 1 : 0), 1) : 1);
	let maxImports = $derived(fileNodes.length > 0 ? fileNodes.reduce((max, n) => Math.max(max, n.analysis?.importsCount || 0), 1) : 1);
	let maxComposite = $derived(fileNodes.length > 0 ? fileNodes.reduce((max, n) => Math.max(max, getCompositeScore(n)), 1) : 1);
	let maxRisk = $derived(fileNodes.length > 0 ? fileNodes.reduce((max, n) => Math.max(max, n.riskScore || 0), 1) : 1);

	// Heatmap Color scale (Cyan -> Orange -> Red HSL hue interpolation)
	const getHeatColor = (ratio) => {
		const r = Math.max(0, Math.min(1, ratio));
		let hue;
		if (r < 0.5) {
			hue = 190 - (r * 2) * (190 - 45); // Cyan (190) to Amber (45)
		} else {
			hue = 45 - ((r - 0.5) * 2) * 45;   // Amber (45) to Neon Red (0)
		}
		return `hsl(${hue}, 95%, 60%)`;
	};

	// Local non-reactive copies of nodes and edges for the D3 simulation
	let localNodes = [];
	let localEdges = [];

	let simulation = null;
	let transform = $state(d3.zoomIdentity);
	let width = $state(800);
	let height = $state(600);
	let hoveredNode = $state(null);

	// 3D Orbit Camera States
	let viewMode = $state('2d'); // '2d' or '3d'
	let theta = $state(0);       // Y-axis rotation (horizontal)
	let phi = $state(0);         // X-axis rotation (vertical)

	let isRotatingBackground = $state(false);
	let isDraggingNode = $state(false);
	let draggedNode = null;

	let startMouseX = 0;
	let startMouseY = 0;
	let startTheta = 0;
	let startPhi = 0;
	let lastDragPx = 0;
	let lastDragPy = 0;

	// Camera tween reference
	let cameraTween = null;
	// D3 zoom reference
	let zoomBehavior = null;

	const getNodeRadius = (type) => {
		switch (type) {
			case 'root': return 13;
			case 'directory': return 7.5;
			case 'file': return 5.5;
			case 'class': return 4;
			case 'export': return 3.5;
			case 'endpoint': return 5;
			case 'package': return 5;
			default: return 4;
		}
	};

	const getZDepth = (type) => {
		switch (type) {
			case 'root': return 120;
			case 'directory': return 60;
			case 'file': return 0;
			case 'class': return -45;
			case 'export': return -65;
			case 'endpoint': return -30;
			case 'package': return -90;
			default: return 0;
		}
	};

	const getNodeColor = (type, isSelected, isHovered) => {
		if (isSelected) return '#a855f7'; // highlight purple
		if (isHovered) return '#f3f1f7';
		switch (type) {
			case 'root': return '#ffffff';
			case 'directory': return '#14b8a6'; // teal
			case 'file': return '#3b82f6'; // blue
			case 'class': return '#eab308'; // yellow
			case 'export': return '#ec4899'; // pink
			case 'endpoint': return '#f97316'; // orange
			case 'package': return '#22c55e'; // green
			default: return '#a39cb4';
		}
	};

	const getSemanticNodeColor = (node, isSelected, isHovered) => {
		if (isSelected || isHovered) return getNodeColor(node.type, isSelected, isHovered);
		if (colorMode === 'role') return roleColors[node.role] || roleColors.source;
		if (colorMode === 'risk' && node.type === 'file') return riskColors[node.riskLevel] || riskColors.low;
		return getNodeColor(node.type, isSelected, isHovered);
	};

	const hexToRgba = (hex, alpha) => {
		// Handle HSL strings (from heatmap colors)
		if (hex.startsWith('hsl(')) {
			// Extract HSL values and convert to RGBA
			const hslMatch = hex.match(/hsl\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)%,\s*(\d+(?:\.\d+)?)%\)/);
			if (hslMatch) {
				const h = parseFloat(hslMatch[1]);
				const s = parseFloat(hslMatch[2]) / 100;
				const l = parseFloat(hslMatch[3]) / 100;

				// HSL to RGB conversion
				const c = (1 - Math.abs(2 * l - 1)) * s;
				const x = c * (1 - ((h / 60) % 2 - 1));
				const m = l - c / 2;

				let r = 0, g = 0, b = 0;
				if (h >= 0 && h < 60) {
					r = c; g = x; b = 0;
				} else if (h >= 60 && h < 120) {
					r = x; g = c; b = 0;
				} else if (h >= 120 && h < 180) {
					r = 0; g = c; b = x;
				} else if (h >= 180 && h < 240) {
					r = 0; g = x; b = c;
				} else if (h >= 240 && h < 300) {
					r = x; g = 0; b = c;
				} else {
					r = c; g = 0; b = x;
				}

				const rInt = Math.round((r + m) * 255);
				const gInt = Math.round((g + m) * 255);
				const bInt = Math.round((b + m) * 255);

				return `rgba(${rInt}, ${gInt}, ${bInt}, ${alpha})`;
			}
		}

		if (hex === '#ffffff' || hex === '#f3f1f7') return `rgba(255, 255, 255, ${alpha})`;
		const colors = {
			'#a855f7': `rgba(168, 85, 247, ${alpha})`,
			'#14b8a6': `rgba(20, 184, 166, ${alpha})`,
			'#3b82f6': `rgba(59, 130, 246, ${alpha})`,
			'#eab308': `rgba(234, 179, 8, ${alpha})`,
			'#ec4899': `rgba(236, 72, 153, ${alpha})`,
			'#f97316': `rgba(249, 115, 22, ${alpha})`,
			'#22c55e': `rgba(34, 197, 94, ${alpha})`,
			'#64748b': `rgba(100, 116, 139, ${alpha})`,
			'#8b5cf6': `rgba(139, 92, 246, ${alpha})`,
			'#06b6d4': `rgba(6, 182, 212, ${alpha})`,
			'#f59e0b': `rgba(245, 158, 11, ${alpha})`,
			'#84cc16': `rgba(132, 204, 22, ${alpha})`,
			'#ef4444': `rgba(239, 68, 68, ${alpha})`,
			'#a39cb4': `rgba(163, 156, 180, ${alpha})`
		};
		return colors[hex] || `rgba(168, 85, 247, ${alpha})`;
	};

	// Camera glide function using GSAP
	const glideCameraTo = (targetX, targetY, targetScale) => {
		if (!canvas) return;
		if (cameraTween) cameraTween.kill();

		const w = width > 0 ? width : 800;
		const h = height > 0 ? height : 600;

		// Calculate translation to keep target coordinate in the center
		const destX = w / 2 - targetX * targetScale;
		const destY = h / 2 - targetY * targetScale;

		const currentTransform = {
			x: transform.x,
			y: transform.y,
			k: transform.k
		};

		cameraTween = gsap.to(currentTransform, {
			x: destX,
			y: destY,
			k: targetScale,
			duration: 0.85,
			ease: "power2.out",
			onUpdate: () => {
				transform = d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(currentTransform.k);
				// Update D3 zoom internal state on canvas
				d3.select(canvas).property("__zoom", transform);
			}
		});
	};

	// Draw simulation frame to canvas (called at 60fps in render loop)
	const ticked = () => {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');

		const w = width > 0 ? width : 800;
		const h = height > 0 ? height : 600;

		ctx.save();
		ctx.clearRect(0, 0, w, h);

		let activeTransform = transform;
		if (isNaN(activeTransform.x) || isNaN(activeTransform.y) || isNaN(activeTransform.k)) {
			activeTransform = d3.zoomIdentity;
		}

		// 1. Draw Space Grid background with parallax offset
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.022)';
		ctx.lineWidth = 1;
		const baseGridSize = 64;
		const currentGridSize = baseGridSize * (1 + (activeTransform.k - 1) * 0.15);
		const gridOffsetX = (activeTransform.x * 0.15) % currentGridSize;
		const gridOffsetY = (activeTransform.y * 0.15) % currentGridSize;

		ctx.beginPath();
		for (let x = gridOffsetX; x < w; x += currentGridSize) {
			ctx.moveTo(x, 0);
			ctx.lineTo(x, h);
		}
		for (let y = gridOffsetY; y < h; y += currentGridSize) {
			ctx.moveTo(0, y);
			ctx.lineTo(w, y);
		}
		ctx.stroke();

		// Compute 3D perspective projection coordinates if active
		if (viewMode === '3d') {
			// Auto spin slowly if not actively dragging or rotating
			if (!isRotatingBackground && !isDraggingNode) {
				theta += 0.0015;
			}

			const cosT = Math.cos(theta);
			const sinT = Math.sin(theta);
			const cosP = Math.cos(phi);
			const sinP = Math.sin(phi);

			localNodes.forEach(node => {
				if (node.x === undefined || node.y === undefined) return;

				// Center coordinates around (w/2, h/2)
				const dx = node.x - w / 2;
				const dy = node.y - h / 2;
				const dz = node.z !== undefined ? node.z : 0;

				// Y-axis rotation (theta)
				const x1 = dx * cosT - dz * sinT;
				const z1 = dx * sinT + dz * cosT;

				// X-axis rotation (phi)
				const y2 = dy * cosP - z1 * sinP;
				const z2 = dy * sinP + z1 * cosP;

				// Perspective projection
				const cameraDist = 550;
				const perspective = cameraDist / (cameraDist + z2);

				node.px = w / 2 + x1 * perspective;
				node.py = h / 2 + y2 * perspective;
				node.projScale = perspective;
				node.depthZ = z2; // save depth for depth sorting
			});
		} else {
			localNodes.forEach(node => {
				node.px = node.x;
				node.py = node.y;
				node.projScale = 1.0;
				node.depthZ = 0;
			});
		}

		// Compute active subsets for Dependency Cascades and focus modes
		const activeNodes = new Set();
		const directNodes = new Set();
		const activeEdges = new Set();
		const selectedLocalNode = selectedNode ? localNodes.find(node => node.id === selectedNode.id) : null;

		if (selectedNode) {
			const selId = selectedNode.id;
			activeNodes.add(selId);
			directNodes.add(selId);

			if (focusMode === 'all') {
				localNodes.forEach(node => activeNodes.add(node.id));
				localEdges.forEach(edge => activeEdges.add(edge));
			} else if (focusMode === 'sameRole') {
				const role = selectedLocalNode?.role || selectedNode.role;
				localNodes.forEach(node => {
					if (node.role === role) {
						activeNodes.add(node.id);
						directNodes.add(node.id);
					}
				});
				localEdges.forEach(edge => {
					const sId = typeof edge.source === 'object' ? edge.source.id : edge.source;
					const tId = typeof edge.target === 'object' ? edge.target.id : edge.target;
					if (activeNodes.has(sId) && activeNodes.has(tId)) activeEdges.add(edge);
				});
			} else {
				// First pass: find direct neighbors
				localEdges.forEach(edge => {
					const sId = typeof edge.source === 'object' ? edge.source.id : edge.source;
					const tId = typeof edge.target === 'object' ? edge.target.id : edge.target;

					if (focusMode === 'dependencies') {
						if (edge.type === 'import' && sId === selId) {
							directNodes.add(tId);
							activeNodes.add(tId);
							activeEdges.add(edge);
						}
					} else if (focusMode === 'dependents') {
						if (edge.type === 'import' && tId === selId) {
							directNodes.add(sId);
							activeNodes.add(sId);
							activeEdges.add(edge);
						}
					} else if (sId === selId) {
						directNodes.add(tId);
						activeNodes.add(tId);
						activeEdges.add(edge);
					} else if (tId === selId) {
						directNodes.add(sId);
						activeNodes.add(sId);
						activeEdges.add(edge);
					}
				});

				// Second pass: find transitive imports only in the general related mode
				if (focusMode === 'related') {
					localEdges.forEach(edge => {
						const sId = typeof edge.source === 'object' ? edge.source.id : edge.source;
						const tId = typeof edge.target === 'object' ? edge.target.id : edge.target;

						if (edge.type === 'import') {
							if (directNodes.has(sId) && !activeNodes.has(tId)) {
								activeNodes.add(tId);
								activeEdges.add(edge);
							} else if (directNodes.has(tId) && !activeNodes.has(sId)) {
								activeNodes.add(sId);
								activeEdges.add(edge);
							}
						}
					});
				}
			}
		}

		// Apply camera transformations (pan and zoom)
		ctx.translate(activeTransform.x, activeTransform.y);
		ctx.scale(activeTransform.k, activeTransform.k);

		// 2. Draw Links (Edges)
		localEdges.forEach(edge => {
			if (!edge.source || !edge.target || typeof edge.source !== 'object' || typeof edge.target !== 'object') return;
			if (edge.source.px === undefined || edge.target.px === undefined) return;

			// Base opacity from depth buffering (3D mode)
			let depthOpacity = 1.0;
			if (viewMode === '3d') {
				const avgDepth = ((edge.source.depthZ || 0) + (edge.target.depthZ || 0)) / 2;
				depthOpacity = Math.max(0.18, Math.min(1.0, 1.0 - (avgDepth + 100) / 320));
			}

			// Opacity from dependency selection
			let highlightOpacity = 1.0;
			let isEdgeActive = false;
			if (selectedNode) {
				isEdgeActive = activeEdges.has(edge);
				highlightOpacity = isEdgeActive ? 1.0 : 0.12;
			}

			const finalOpacity = depthOpacity * highlightOpacity;

			ctx.beginPath();
			ctx.moveTo(edge.source.px, edge.source.py);
			ctx.lineTo(edge.target.px, edge.target.py);

			if (edge.type === 'hierarchy') {
				ctx.strokeStyle = `rgba(255, 255, 255, ${0.025 * finalOpacity})`;
				ctx.lineWidth = 0.6;
				ctx.setLineDash([]);
			} else if (edge.type === 'contains') {
				ctx.strokeStyle = `rgba(255, 255, 255, ${0.045 * finalOpacity})`;
				ctx.lineWidth = 0.7;
				ctx.setLineDash([2, 4]);
			} else { // import
				const color = isEdgeActive ? '168, 85, 247' : '168, 85, 247';
				ctx.strokeStyle = `rgba(${color}, ${(isEdgeActive ? 0.45 : 0.13) * finalOpacity})`;
				ctx.lineWidth = isEdgeActive ? 1.4 : 0.9;
				ctx.setLineDash([4, 5]);
			}
			ctx.stroke();
			ctx.setLineDash([]);

			// Precalculate dx, dy, dist for both arrow and particle drawing
			const dx = edge.target.px - edge.source.px;
			const dy = edge.target.py - edge.source.py;
			const dist = Math.sqrt(dx*dx + dy*dy);

			// Draw small directional arrows for imports and contains
			if (edge.type === 'import' || edge.type === 'contains') {
				if (dist > 0) {
					const angle = Math.atan2(dy, dx);
					const targetScale = edge.target.scale !== undefined ? edge.target.scale : 1.0;
					const targetSelectScale = edge.target.selectScale !== undefined ? edge.target.selectScale : 1.0;
					const projScale = edge.target.projScale !== undefined ? edge.target.projScale : 1.0;
					const r = getNodeRadius(edge.target.type) * targetScale * targetSelectScale * projScale;

					// Place arrowhead at target node boundary
					const arrowX = edge.target.px - r * Math.cos(angle);
					const arrowY = edge.target.py - r * Math.sin(angle);

					ctx.beginPath();
					ctx.moveTo(arrowX, arrowY);
					ctx.lineTo(
						arrowX - 4 * Math.cos(angle - Math.PI / 8),
						arrowY - 4 * Math.sin(angle - Math.PI / 8)
					);
					ctx.lineTo(
						arrowX - 4 * Math.cos(angle + Math.PI / 8),
						arrowY - 4 * Math.sin(angle + Math.PI / 8)
					);
					ctx.closePath();

					const fillOpacity = (edge.type === 'import' ? 0.4 : 0.15) * finalOpacity;
					ctx.fillStyle = edge.type === 'import' ? `rgba(168, 85, 247, ${fillOpacity})` : `rgba(255, 255, 255, ${fillOpacity})`;
					ctx.fill();
				}
			}

			// Draw glowing data flow particles along lines (only for active dependency paths)
			const shouldDrawParticles = !selectedNode || isEdgeActive;
			if (shouldDrawParticles && dist > 15) {
				const time = performance.now() * 0.001;
				// Speed up particles on selected active edges for visual feedback!
				const speedFactor = (selectedNode && isEdgeActive) ? 1.6 : 1.0;
				const speed = (edge.type === 'import' ? 0.38 : 0.22) * speedFactor;
				const indexOffset = (edge.index || 0) * 0.37;

				const numPackets = edge.type === 'import' ? 2 : 1;
				for (let p = 0; p < numPackets; p++) {
					const offset = p * 0.5 + indexOffset;
					const progress = (time * speed + offset) % 1.0;

					const px = edge.source.px + dx * progress;
					const py = edge.source.py + dy * progress;

					ctx.beginPath();
					const scaleMultiplier = viewMode === '3d' ? ((edge.source.projScale + edge.target.projScale) / 2) : 1.0;
					const packetRadius = (edge.type === 'import' ? 2.2 : 1.5) * scaleMultiplier;
					ctx.arc(px, py, packetRadius, 0, 2 * Math.PI);

					if (edge.type === 'import') {
						ctx.fillStyle = `rgba(192, 132, 252, ${finalOpacity})`;
						ctx.shadowColor = '#a855f7';
						ctx.shadowBlur = isEdgeActive ? 8 : 5;
					} else if (edge.type === 'contains') {
						ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * finalOpacity})`;
						ctx.shadowColor = '#ffffff';
						ctx.shadowBlur = 4;
					} else { // hierarchy
						ctx.fillStyle = `rgba(20, 184, 166, ${0.55 * finalOpacity})`;
						ctx.shadowColor = '#14b8a6';
						ctx.shadowBlur = 4;
					}
					ctx.fill();
					ctx.shadowBlur = 0; // reset instantly
				}
			}
		});

		// 3. Draw Nodes (Depth Sorted in 3D Mode via painter's algorithm)
		const sortedNodes = viewMode === '3d'
			? [...localNodes].sort((a, b) => (b.depthZ || 0) - (a.depthZ || 0))
			: localNodes;

		sortedNodes.forEach(node => {
			if (node.x === undefined || node.y === undefined || node.px === undefined) return;

			const isSelected = selectedNode && selectedNode.id === node.id;
			const isHovered = hoveredNode && hoveredNode.id === node.id;

			// Highlight opacity sizing
			let highlightOpacity = 1.0;
			if (selectedNode) {
				if (isSelected) {
					highlightOpacity = 1.0;
				} else if (directNodes.has(node.id)) {
					highlightOpacity = 0.95;
				} else if (activeNodes.has(node.id)) {
					highlightOpacity = 0.65;
				} else {
					highlightOpacity = 0.12; // Dim out non-related elements
				}
			}

			let nodeScale = node.scale !== undefined ? node.scale : 1.0;
			let nodeSelectScale = node.selectScale !== undefined ? node.selectScale : 1.0;
			let projScale = node.projScale !== undefined ? node.projScale : 1.0;

			let radius = getNodeRadius(node.type) * nodeScale * nodeSelectScale * projScale;
			let baseColor = getSemanticNodeColor(node, isSelected, isHovered);
			let extraOpacityFactor = 1.0;

			// Complexity Heatmap overlays override node styles
			if (heatmapMetric !== 'none') {
				if (node.type === 'file') {
					let ratio = 0;
					if (heatmapMetric === 'size') {
						ratio = (node.size || 0) / maxFileSize;
					} else if (heatmapMetric === 'depth') {
						const depth = node.id ? node.id.split('/').length - 1 : 0;
						ratio = depth / maxDepth;
					} else if (heatmapMetric === 'imports') {
						ratio = (node.analysis?.importsCount || 0) / maxImports;
					} else if (heatmapMetric === 'risk') {
						ratio = (node.riskScore || 0) / maxRisk;
					} else if (heatmapMetric === 'composite') {
						ratio = getCompositeScore(node) / maxComposite;
					}
					ratio = Math.max(0, Math.min(1, ratio));

					radius = (4 + ratio * 12) * nodeScale * nodeSelectScale * projScale;
					baseColor = getHeatColor(ratio);
				} else if (node.type !== 'root') {
					// Shrink and dim background non-file components to let the heatmap files pop
					radius = 3.0 * nodeScale * nodeSelectScale * projScale;
					baseColor = '#374151'; // neutral slate
					extraOpacityFactor = 0.25;
				}
			}

			if (radius <= 0.15) return; // skip rendering if scaled to 0

			let depthOpacity = 1.0;
			if (viewMode === '3d') {
				depthOpacity = Math.max(0.25, Math.min(1.0, 1.0 - (node.depthZ + 100) / 320));
			}

			const finalOpacity = depthOpacity * highlightOpacity * extraOpacityFactor;

			// Draw glowing aura
			ctx.beginPath();
			ctx.arc(node.px, node.py, radius + (isSelected ? 6 : isHovered ? 3.5 : 2), 0, 2 * Math.PI);

			// Increase shadow blur and intensity for high-complexity heat nodes!
			let auraColor = baseColor;
			let auraOpacity = (isSelected ? 0.42 : isHovered ? 0.28 : 0.12) * finalOpacity;
			if (heatmapMetric !== 'none' && node.type === 'file') {
				const ratio = heatmapMetric === 'size' ? (node.size || 0) / maxFileSize
					: heatmapMetric === 'depth' ? (node.id ? node.id.split('/').length - 1 : 0) / maxDepth
					: heatmapMetric === 'imports' ? (node.analysis?.importsCount || 0) / maxImports
					: heatmapMetric === 'risk' ? (node.riskScore || 0) / maxRisk
					: getCompositeScore(node) / maxComposite;
				if (ratio > 0.65) {
					ctx.shadowColor = baseColor;
					ctx.shadowBlur = 10 * nodeSelectScale;
					auraOpacity = 0.5 * finalOpacity;
				}
			}

			ctx.fillStyle = hexToRgba(auraColor, auraOpacity);
			ctx.fill();
			ctx.shadowBlur = 0; // reset instantly

			// Draw main circle
			ctx.beginPath();
			ctx.arc(node.px, node.py, radius, 0, 2 * Math.PI);
			ctx.fillStyle = hexToRgba(baseColor, finalOpacity);
			ctx.strokeStyle = isSelected
				? `rgba(255, 255, 255, ${finalOpacity})`
				: node.riskLevel === 'high'
					? `rgba(239, 68, 68, ${0.75 * finalOpacity})`
				: node.riskLevel === 'medium'
					? `rgba(249, 115, 22, ${0.55 * finalOpacity})`
				: `rgba(255, 255, 255, ${0.15 * finalOpacity})`;
			ctx.lineWidth = isSelected ? 2 : node.riskLevel === 'high' ? 1.75 : node.riskLevel === 'medium' ? 1.35 : 1;
			ctx.fill();
			ctx.stroke();

			// Draw text labels
			let showLabel = isSelected || isHovered || node.type === 'root' || node.type === 'directory' ||
				(activeTransform.k > 0.9 && node.type === 'file' && (!selectedNode || activeNodes.has(node.id))) ||
				(activeTransform.k > 1.6 && (!selectedNode || activeNodes.has(node.id)));

			// Hide non-file labels in heatmap mode to declutter visualization
			if (heatmapMetric !== 'none' && node.type !== 'file' && node.type !== 'root' && !isSelected && !isHovered) {
				showLabel = false;
			}

			if (showLabel) {
				const fontSize = isSelected ? 11 : isHovered ? 10 : 10;
				ctx.font = isSelected
					? `bold ${fontSize}px "Outfit", sans-serif`
					: isHovered ? `500 ${fontSize}px "Outfit", sans-serif` : `${fontSize}px "Outfit", sans-serif`;

				const textColor = isSelected
					? '#ffffff'
					: isHovered ? '#f3f1f7' : (node.type === 'directory' ? '#b2f5ea' : '#c4bdd4');

				const labelX = node.px + radius + 7;
				const labelY = node.py + 3;

				// Draw dark pill background for ambient labels (not selected)
				if (!isSelected) {
					const metrics = ctx.measureText(node.name);
					const padH = 3;
					const padV = 2.5;
					ctx.fillStyle = `rgba(8, 6, 18, ${0.58 * finalOpacity})`;
					ctx.beginPath();
					ctx.roundRect(
						labelX - padH,
						labelY - fontSize + 1 - padV,
						metrics.width + padH * 2,
						fontSize + padV * 2,
						3
					);
					ctx.fill();
				}

				ctx.fillStyle = hexToRgba(textColor, finalOpacity);
				ctx.shadowColor = 'rgba(0,0,0,0.8)';
				ctx.shadowBlur = isSelected ? 6 : 0;
				ctx.fillText(node.name, labelX, labelY);
				ctx.shadowBlur = 0;
			}
		});

		// 4. Draw Canvas HUD Screen Legend Overlay
		if (heatmapMetric !== 'none') {
			ctx.save();
			// Reset translation and scale so we draw legend in screen space coordinates!
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			const dpr = window.devicePixelRatio || 1;
			ctx.scale(dpr, dpr);

			// Draw glass card background in the bottom-right corner
			const lx = w - 245;
			const ly = h - 60;
			const lw = 225;
			const lh = 42;

			ctx.fillStyle = 'rgba(12, 10, 20, 0.82)';
			ctx.strokeStyle = 'rgba(168, 85, 247, 0.25)';
			ctx.lineWidth = 1.25;

			ctx.beginPath();
			ctx.roundRect(lx, ly, lw, lh, 8);
			ctx.fill();
			ctx.stroke();

			// Draw gradient bar
			const grad = ctx.createLinearGradient(lx + 12, ly + 25, lx + lw - 12, ly + 25);
			grad.addColorStop(0.0, 'hsl(190, 95%, 60%)');   // Low: Cyan
			grad.addColorStop(0.5, 'hsl(45, 95%, 60%)');    // Med: Orange/Amber
			grad.addColorStop(1.0, 'hsl(0, 95%, 60%)');     // High: Neon Red

			ctx.fillStyle = grad;
			ctx.fillRect(lx + 12, ly + 20, lw - 24, 6);

			// Legend Text
			ctx.fillStyle = '#ffffff';
			ctx.font = 'bold 9.5px "Outfit", sans-serif';
			const metricLabel = heatmapMetric === 'size' ? 'File Size (Bytes)'
				: heatmapMetric === 'depth' ? 'Directory Depth'
				: heatmapMetric === 'imports' ? 'Coupling (Imports Count)'
				: heatmapMetric === 'risk' ? 'Maintenance Risk Score'
				: 'Composite Complexity Index';
			ctx.fillText(metricLabel, lx + 12, ly + 13);

			ctx.font = 'bold 8px "Outfit", sans-serif';
			ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
			ctx.fillText('Low', lx + 12, ly + 34);
			ctx.fillText('High', lx + lw - 32, ly + 34);

			ctx.restore();
		}

		if (localNodes.length > 0) {
			ctx.save();
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			const dpr = window.devicePixelRatio || 1;
			ctx.scale(dpr, dpr);

			const mapW = 170;
			const mapH = 116;
			const mapX = 18;
			const mapY = Math.max(18, h / 2 - mapH - 24);
			const pad = 12;

			const minX = d3.min(localNodes, node => node.x ?? 0) ?? 0;
			const maxX = d3.max(localNodes, node => node.x ?? 0) ?? 1;
			const minY = d3.min(localNodes, node => node.y ?? 0) ?? 0;
			const maxY = d3.max(localNodes, node => node.y ?? 0) ?? 1;
			const spanX = Math.max(1, maxX - minX);
			const spanY = Math.max(1, maxY - minY);
			const mapScale = Math.min((mapW - pad * 2) / spanX, (mapH - pad * 2) / spanY);
			const offsetX = mapX + mapW / 2 - ((minX + maxX) / 2) * mapScale;
			const offsetY = mapY + mapH / 2 - ((minY + maxY) / 2) * mapScale;

			ctx.fillStyle = 'rgba(12, 10, 20, 0.78)';
			ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.roundRect(mapX, mapY, mapW, mapH, 8);
			ctx.fill();
			ctx.stroke();

			ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
			ctx.font = 'bold 9px "Outfit", sans-serif';
			ctx.fillText('MINIMAP', mapX + 10, mapY + 15);

			localEdges.forEach(edge => {
				if (!edge.source || !edge.target || typeof edge.source !== 'object' || typeof edge.target !== 'object') return;
				const sx = offsetX + (edge.source.x ?? 0) * mapScale;
				const sy = offsetY + (edge.source.y ?? 0) * mapScale;
				const tx = offsetX + (edge.target.x ?? 0) * mapScale;
				const ty = offsetY + (edge.target.y ?? 0) * mapScale;
				ctx.strokeStyle = edge.type === 'import' ? 'rgba(168, 85, 247, 0.28)' : 'rgba(255, 255, 255, 0.08)';
				ctx.lineWidth = edge.type === 'import' ? 0.8 : 0.5;
				ctx.beginPath();
				ctx.moveTo(sx, sy);
				ctx.lineTo(tx, ty);
				ctx.stroke();
			});

			localNodes.forEach(node => {
				const mx = offsetX + (node.x ?? 0) * mapScale;
				const my = offsetY + (node.y ?? 0) * mapScale;
				const isSelected = selectedNode && selectedNode.id === node.id;
				const isActive = !selectedNode || activeNodes.has(node.id);
				ctx.beginPath();
				ctx.arc(mx, my, isSelected ? 3.2 : node.type === 'root' ? 2.6 : 1.8, 0, 2 * Math.PI);
				ctx.fillStyle = isSelected
					? '#ffffff'
					: hexToRgba(getSemanticNodeColor(node, false, false), isActive ? 0.85 : 0.22);
				ctx.fill();
			});

			const viewLeft = activeTransform.invertX(0);
			const viewTop = activeTransform.invertY(0);
			const viewRight = activeTransform.invertX(w);
			const viewBottom = activeTransform.invertY(h);
			const vx = offsetX + viewLeft * mapScale;
			const vy = offsetY + viewTop * mapScale;
			const vw = Math.max(5, (viewRight - viewLeft) * mapScale);
			const vh = Math.max(5, (viewBottom - viewTop) * mapScale);
			ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
			ctx.lineWidth = 1.2;
			ctx.setLineDash([3, 3]);
			ctx.save();
			ctx.beginPath();
			ctx.roundRect(mapX + 1, mapY + 1, mapW - 2, mapH - 2, 8);
			ctx.clip();
			ctx.strokeRect(vx, vy, vw, vh);
			ctx.restore();
			ctx.setLineDash([]);
			ctx.restore();
		}

		ctx.restore();
	};

	// Continuous high-performance render loop
	let animationFrameId;
	const runRenderLoop = () => {
		untrack(() => ticked());
		animationFrameId = requestAnimationFrame(runRenderLoop);
	};

	$effect(() => {
		runRenderLoop();
		return () => {
			if (animationFrameId) cancelAnimationFrame(animationFrameId);
		};
	});

	// Animate layout transitions on layoutMode change
	$effect(() => {
		const mode = layoutMode;
		const data = graphData; // react to new repo data loads
		if (localNodes.length === 0) return;

		untrack(() => {
			if (mode === '2d') {
				viewMode = '2d';
				theta = 0;
				phi = 0;
				if (simulation) {
					simulation.alpha(0.35).restart();
				}
				// Animate z to 0
				localNodes.forEach(node => {
					gsap.killTweensOf(node, 'z');
					gsap.to(node, {
						z: 0,
						duration: 1.1,
						ease: 'power2.out'
					});
				});
			} else {
				const prevViewMode = viewMode;
				viewMode = '3d';

				if (prevViewMode === '2d') {
					theta = 0.25;
					phi = 0.25;
				}

				if (mode === '3d_tower') {
					if (simulation) {
						simulation.alpha(0.35).restart();
					}
					localNodes.forEach(node => {
						gsap.killTweensOf(node, ['x', 'y', 'z']);
						gsap.to(node, {
							z: getZDepth(node.type),
							duration: 1.1,
							ease: 'power2.out'
						});
					});
				} else if (mode === '3d_sphere') {
					if (simulation) simulation.stop();
					localNodes.forEach((node, i) => {
						const { tx, ty, tz } = getSphericalPos(i, localNodes.length);
						gsap.killTweensOf(node, ['x', 'y', 'z']);
						gsap.to(node, {
							x: tx,
							y: ty,
							z: tz,
							duration: 1.35,
							ease: 'power2.inOut'
						});
					});
				} else if (mode === '3d_cylinder') {
					if (simulation) simulation.stop();
					localNodes.forEach((node, i) => {
						const { tx, ty, tz } = getCylindricalPos(i, localNodes.length);
						gsap.killTweensOf(node, ['x', 'y', 'z']);
						gsap.to(node, {
							x: tx,
							y: ty,
							z: tz,
							duration: 1.35,
							ease: 'power2.inOut'
						});
					});
				}
			}
		});
	});

	// GSAP Node Hover Scale transitions
	$effect(() => {
		const currentHovered = hoveredNode;
		untrack(() => {
			localNodes.forEach(node => {
				const isHovered = currentHovered && node.id === currentHovered.id;
				const targetScale = isHovered ? 1.3 : 1.0;

				if (node.scaleTarget !== targetScale) {
					node.scaleTarget = targetScale;
					gsap.to(node, {
						scale: targetScale,
						duration: 0.25,
						ease: "power2.out"
					});
				}
			});
		});
	});

	// GSAP Node Selection Scale transitions
	$effect(() => {
		const currentSelected = selectedNode;
		untrack(() => {
			localNodes.forEach(node => {
				const isSelected = currentSelected && node.id === currentSelected.id;
				const targetSelectScale = isSelected ? 1.45 : 1.0;

				if (node.selectScaleTarget !== targetSelectScale) {
					node.selectScaleTarget = targetSelectScale;
					gsap.to(node, {
						selectScale: targetSelectScale,
						duration: 0.45,
						ease: "back.out(2.0)"
					});
				}
			});
		});
	});

	// GSAP Camera Sync on Selection & Layout Changes
	$effect(() => {
		const node = selectedNode;
		const mode = viewMode; // watch for 3D/2D toggle to reset zoom correctly
		const layout = layoutMode; // watch for layout changes to keep focused node centered
		untrack(() => {
			if (node) {
				const local = localNodes.find(n => n.id === node.id);
				if (local) {
					const delay = (layout === '3d_sphere' || layout === '3d_cylinder') ? 0.35 : 0;
					setTimeout(() => {
						const currentLocal = localNodes.find(n => n.id === node.id);
						if (!currentLocal) return;
						const tx = viewMode === '3d' ? (currentLocal.px !== undefined ? currentLocal.px : currentLocal.x) : currentLocal.x;
						const ty = viewMode === '3d' ? (currentLocal.py !== undefined ? currentLocal.py : currentLocal.y) : currentLocal.y;
						glideCameraTo(tx, ty, 1.55);
					}, delay * 1000);
				}
			} else if (localNodes.length > 0) {
				resetZoom();
			}
		});
	});

	// Dynamically update D3 Zoom Filter when viewMode changes
	$effect(() => {
		const currentMode = viewMode;
		if (zoomBehavior && canvas) {
			zoomBehavior.filter((event) => {
				// Don't respond to right-clicks or auxiliary clicks
				if (event.button) return false;

				// Check if mouse is hovering over a node
				const [mx, my] = d3.pointer(event, canvas);
				let nodeClose = false;
				localNodes.forEach(node => {
					if (node.px === undefined) return;
					const sx = node.px * transform.k + transform.x;
					const sy = node.py * transform.k + transform.y;

					const dx = sx - mx;
					const dy = sy - my;
					const dist = Math.sqrt(dx*dx + dy*dy);
					if (dist < 22) {
						nodeClose = true;
					}
				});

				// Block zoom/pan interaction if we are dragging a node
				if (nodeClose) return false;

				// In 3D Orbit mode, block background panning dragging, but allow wheel scaling
				if (currentMode === '3d' && event.type === 'mousedown') {
					return false;
				}

				return true;
			});
		}
	});

	// Initialize D3 Force Simulation when graphData changes
	$effect(() => {
		const data = graphData;
		if (!data || !data.nodes || data.nodes.length === 0) return;

		untrack(() => {
			if (simulation) simulation.stop();

			const w = width > 0 ? width : 800;
			const h = height > 0 ? height : 600;

			// Create local non-reactive copies of nodes
			localNodes = data.nodes.map(d => {
				const existing = localNodes.find(n => n.id === d.id);
				return {
					...d,
					x: existing ? existing.x : undefined,
					y: existing ? existing.y : undefined,
					vx: existing ? existing.vx : undefined,
					vy: existing ? existing.vy : undefined,
					scale: existing && existing.scale !== undefined ? existing.scale : 0.0, // starts at 0 for spawn expansion
					selectScale: existing && existing.selectScale !== undefined ? existing.selectScale : 1.0,
					scaleTarget: 1.0,
					selectScaleTarget: 1.0,
					z: getZDepth(d.type)
				};
			});

			localEdges = data.edges.map(d => ({ ...d }));

			// Arrange nodes initially around the center space
			localNodes.forEach((node, i) => {
				if (node.x === undefined || node.y === undefined) {
					const angle = (i / localNodes.length) * 2 * Math.PI;
					const dist = 120 + Math.random() * 180;
					node.x = w / 2 + dist * Math.cos(angle);
					node.y = h / 2 + dist * Math.sin(angle);
				}
			});

			const nodeCount = localNodes.length;

			simulation = d3.forceSimulation(localNodes)
				.force('link', d3.forceLink(localEdges).id(d => d.id).distance(d => {
					if (d.type === 'hierarchy') return 55;
					if (d.type === 'contains') return 28;
					return 90;
				}).strength(d => {
					if (d.type === 'hierarchy') return 0.7;
					if (d.type === 'contains') return 0.5;
					return 0.3;
				}))
				.force('charge', d3.forceManyBody().strength(d => {
					const base = d.type === 'root' ? -280 : d.type === 'directory' ? -110 : d.type === 'file' ? -55 : -18;
					return nodeCount > 80 ? base * 0.4 : base;
				}))
				.force('center', d3.forceCenter(w / 2, h / 2))
				.force('x', d3.forceX(w / 2).strength(nodeCount > 80 ? 0.05 : 0.02))
				.force('y', d3.forceY(h / 2).strength(nodeCount > 80 ? 0.05 : 0.02))
				.force('collision', d3.forceCollide().radius(d => getNodeRadius(d.type) + 10))
				.on('tick', ticked);

			// GSAP spawn/entrance animation for nodes
			localNodes.forEach((node, idx) => {
				if (node.scale === 0.0) {
					gsap.to(node, {
						scale: 1.0,
						duration: 0.65,
						delay: Math.min(1.0, idx * 0.02),
						ease: "back.out(1.5)"
					});
				}
			});

			// Connect D3 zoom
			zoomBehavior = d3.zoom()
				.scaleExtent([0.15, 8])
				.on('start', () => {
					if (cameraTween) cameraTween.kill();
				})
				.on('zoom', (event) => {
					transform = event.transform;
				});

			const d3Canvas = d3.select(canvas);
			d3Canvas.call(zoomBehavior);

			// Initial camera fit centering
			setTimeout(() => {
				if (localNodes.length === 0) return;
				let minX = d3.min(localNodes, d => d.x);
				let maxX = d3.max(localNodes, d => d.x);
				let minY = d3.min(localNodes, d => d.y);
				let maxY = d3.max(localNodes, d => d.y);

				const graphW = maxX - minX || 1;
				const graphH = maxY - minY || 1;

				let scale = Math.min(0.85, Math.min(w / graphW, h / graphH));
				if (isNaN(scale) || scale <= 0 || !isFinite(scale)) {
					scale = 0.8;
				}

				const midX = (minX + maxX) / 2;
				const midY = (minY + maxY) / 2;

				const nextTransform = d3.zoomIdentity
					.translate(w / 2 - midX * scale, h / 2 - midY * scale)
					.scale(scale);

				transform = nextTransform;
				d3Canvas.call(zoomBehavior.transform, nextTransform);
			}, 250);
		});

		return () => {
			if (simulation) simulation.stop();
		};
	});

	// Handle Canvas resizing and update High-DPI resolution
	$effect(() => {
		if (!container || !canvas) return;

		const resizeObserver = new ResizeObserver(entries => {
			for (let entry of entries) {
				width = entry.contentRect.width || 800;
				height = entry.contentRect.height || 600;

				const dpr = window.devicePixelRatio || 1;
				canvas.width = width * dpr;
				canvas.height = height * dpr;
				canvas.getContext('2d').scale(dpr, dpr);
			}
		});

		resizeObserver.observe(container);
		return () => resizeObserver.disconnect();
	});

	// Mouse Event Handlers for 3D navigation & Node dragging
	const handleMouseDown = (event) => {
		if (!canvas || !localNodes.length) return;
		const rect = canvas.getBoundingClientRect();
		const mx = event.clientX - rect.left;
		const my = event.clientY - rect.top;

		// D3 coordinates for starting points
		const px = transform.invertX(mx);
		const py = transform.invertY(my);

		// Find the node under the cursor using projected coordinates
		let closest = null;
		let minDist = 22; // search radius in pixels

		localNodes.forEach(node => {
			if (node.x === undefined || node.px === undefined) return;

			// Map node projected coordinate to screen space
			const sx = node.px * transform.k + transform.x;
			const sy = node.py * transform.k + transform.y;

			const dx = sx - mx;
			const dy = sy - my;
			const dist = Math.sqrt(dx*dx + dy*dy);

			if (dist < minDist) {
				minDist = dist;
				closest = node;
			}
		});

		if (closest) {
			isDraggingNode = true;
			draggedNode = closest;

			lastDragPx = px;
			lastDragPy = py;

			if (layoutMode === '2d' || layoutMode === '3d_tower') {
				draggedNode.fx = draggedNode.x;
				draggedNode.fy = draggedNode.y;
				if (simulation) simulation.alphaTarget(0.2).restart();
			} else {
				draggedNode.fx = null;
				draggedNode.fy = null;
			}

			event.preventDefault();
		} else {
			// Clicked background: start 3D horizontal/vertical rotation
			if (viewMode === '3d') {
				isRotatingBackground = true;
				startMouseX = event.clientX;
				startMouseY = event.clientY;
				startTheta = theta;
				startPhi = phi;
				event.preventDefault();
			}
		}
	};

	const handleMouseMove = (event) => {
		if (!canvas || !localNodes.length) return;
		const rect = canvas.getBoundingClientRect();
		const mx = event.clientX - rect.left;
		const my = event.clientY - rect.top;
		const px = transform.invertX(mx);
		const py = transform.invertY(my);

		if (isDraggingNode && draggedNode) {
			// Mouse translation delta in D3 space
			const dpx = px - lastDragPx;
			const dpy = py - lastDragPy;

			if (viewMode === '3d') {
				// Rotate mouse delta by current horizontal view angle theta so drag matches mouse movement on screen
				const cosT = Math.cos(theta);
				const sinT = Math.sin(theta);

				const rx = dpx * cosT + dpy * sinT;
				const ry = -dpx * sinT + dpy * cosT;

				if (layoutMode === '3d_tower') {
					draggedNode.fx = (draggedNode.fx !== undefined && draggedNode.fx !== null ? draggedNode.fx : draggedNode.x) + rx;
					draggedNode.fy = (draggedNode.fy !== undefined && draggedNode.fy !== null ? draggedNode.fy : draggedNode.y) + ry;
				} else {
					draggedNode.x = (draggedNode.x !== undefined ? draggedNode.x : 0) + rx;
					draggedNode.y = (draggedNode.y !== undefined ? draggedNode.y : 0) + ry;
				}
			} else {
				// Standard 2D drag
				draggedNode.fx = (draggedNode.fx !== undefined && draggedNode.fx !== null ? draggedNode.fx : draggedNode.x) + dpx;
				draggedNode.fy = (draggedNode.fy !== undefined && draggedNode.fy !== null ? draggedNode.fy : draggedNode.y) + dpy;
			}

			lastDragPx = px;
			lastDragPy = py;
		} else if (isRotatingBackground && viewMode === '3d') {
			const dx = event.clientX - startMouseX;
			const dy = event.clientY - startMouseY;

			theta = startTheta + dx * 0.008;
			// Limit vertical orbit vertical pitch to avoid gymbal lock / flipping
			phi = Math.max(-Math.PI / 3.2, Math.min(Math.PI / 3.2, startPhi + dy * 0.008));
		} else {
			// Hover detection
			let closest = null;
			let minDist = 22; // search radius in pixels

			localNodes.forEach(node => {
				if (node.x === undefined || node.px === undefined) return;

				const sx = node.px * transform.k + transform.x;
				const sy = node.py * transform.k + transform.y;

				const dx = sx - mx;
				const dy = sy - my;
				const dist = Math.sqrt(dx*dx + dy*dy);

				if (dist < minDist) {
					minDist = dist;
					closest = node;
				}
			});

			const currentHoveredId = hoveredNode ? hoveredNode.id : null;
			const closestId = closest ? closest.id : null;
			if (currentHoveredId !== closestId) {
				hoveredNode = closest;
			}
		}
	};

	const handleMouseUp = () => {
		if (isDraggingNode && draggedNode) {
			if (layoutMode === '2d' || layoutMode === '3d_tower') {
				draggedNode.fx = null;
				draggedNode.fy = null;
				if (simulation) simulation.alphaTarget(0);
			}
			draggedNode = null;
			isDraggingNode = false;
		}
		isRotatingBackground = false;
	};

	const handleClick = (event) => {
		// Prevent clicked event when finishing rotation or drag
		if (isDraggingNode || isRotatingBackground) return;

		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const mx = event.clientX - rect.left;
		const my = event.clientY - rect.top;

		let closest = null;
		let minDist = 22; // search radius in pixels

		localNodes.forEach(node => {
			if (node.x === undefined || node.px === undefined) return;

			const sx = node.px * transform.k + transform.x;
			const sy = node.py * transform.k + transform.y;

			const dx = sx - mx;
			const dy = sy - my;
			const dist = Math.sqrt(dx*dx + dy*dy);

			if (dist < minDist) {
				minDist = dist;
				closest = node;
			}
		});

		if (closest) {
			const originalNode = graphData.nodes.find(n => n.id === closest.id);
			onSelectNode(originalNode || closest);
		} else {
			onSelectNode(null);
		}
	};



	const handleZoom = (factor) => {
		if (!canvas) return;
		const targetScale = factor === 'in' ? transform.k * 1.4 : transform.k / 1.4;

		if (cameraTween) cameraTween.kill();

		const w = width > 0 ? width : 800;
		const h = height > 0 ? height : 600;

		const destX = w / 2 - targetScale * (w / 2 - transform.x) / transform.k;
		const destY = h / 2 - targetScale * (h / 2 - transform.y) / transform.k;

		const currentTransform = {
			x: transform.x,
			y: transform.y,
			k: transform.k
		};

		cameraTween = gsap.to(currentTransform, {
			x: destX,
			y: destY,
			k: targetScale,
			duration: 0.6,
			ease: "power2.out",
			onUpdate: () => {
				transform = d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(currentTransform.k);
				d3.select(canvas).property("__zoom", transform);
			}
		});
	};

	const resetZoom = () => {
		if (!canvas || !localNodes.length) return;
		let minX = d3.min(localNodes, d => d.x);
		let maxX = d3.max(localNodes, d => d.x);
		let minY = d3.min(localNodes, d => d.y);
		let maxY = d3.max(localNodes, d => d.y);

		const graphW = maxX - minX || 1;
		const graphH = maxY - minY || 1;
		const w = width > 0 ? width : 800;
		const h = height > 0 ? height : 600;

		let scale = Math.min(0.85, Math.min(w / graphW, h / graphH));
		if (isNaN(scale) || scale <= 0 || !isFinite(scale)) {
			scale = 0.8;
		}

		const midX = (minX + maxX) / 2;
		const midY = (minY + maxY) / 2;

		if (cameraTween) cameraTween.kill();

		const destX = w / 2 - midX * scale;
		const destY = h / 2 - midY * scale;

		const currentTransform = {
			x: transform.x,
			y: transform.y,
			k: transform.k
		};

		cameraTween = gsap.to(currentTransform, {
			x: destX,
			y: destY,
			k: scale,
			duration: 0.95,
			ease: "power2.inOut",
			onUpdate: () => {
				transform = d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(currentTransform.k);
				d3.select(canvas).property("__zoom", transform);
			}
		});
	};

	onDestroy(() => {
		if (simulation) simulation.stop();
		if (animationFrameId) cancelAnimationFrame(animationFrameId);
		if (cameraTween) cameraTween.kill();
	});
</script>

<div class="visualizer-card" bind:this={container}>
	<div class="visualizer-header">
		<div class="visualizer-title">
			<span class="legend-dot dot-file" style="margin-right: 0.15rem;"></span>
			Interactive Graph Simulation {viewMode === '3d' ? '(3D Orbit)' : '(2D Plane)'}
		</div>

		<!-- Search Bar Component -->
		<div
			class="search-container"
			style="position: relative; margin: 0 1.25rem; flex: 1; max-width: 250px;"
			role="search"
			onmouseenter={() => onHelpKey?.('search_bar')}
			onmouseleave={() => onHelpKey?.(null)}
		>
			<input
				class="search-input"
				type="text"
				bind:value={searchQuery}
				onfocus={() => searchFocused = true}
				onblur={() => setTimeout(() => searchFocused = false, 180)}
				placeholder="Search modules, files, endpoints..."
			/>
			{#if searchFocused && searchMatches.length > 0}
				<div class="search-dropdown">
					{#each searchMatches as match}
						<button
							class="search-item"
							type="button"
							onclick={() => handleSelectMatch(match)}
						>
							<span class="legend-dot {getDotClass(match.type)}" style="margin-right: 0.45rem; scale: 0.95; flex-shrink: 0;"></span>
							<div style="display: flex; flex-direction: column; align-items: flex-start; gap: 0.05rem; overflow: hidden; width: 100%;">
								<span class="search-item-name">{match.name}</span>
								<span class="search-item-path">{match.role || match.type} | {match.riskLevel || 'n/a'} | {match.id}</span>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<div class="zoom-controls">
			<!-- Semantic Color Mode selector -->
			<select
				class="color-mode-select"
				bind:value={colorMode}
				title="Change Node Color Mode"
				onmouseenter={() => onHelpKey?.('color_mode_select')}
				onmouseleave={() => onHelpKey?.(null)}
			>
				<option value="type">Color: Type</option>
				<option value="role">Color: Architecture</option>
				<option value="risk">Color: Risk</option>
			</select>

			<!-- Complexity Heatmap selector -->
			<select
				class="heatmap-select"
				bind:value={heatmapMetric}
				title="Toggle Complexity Heatmap"
				onmouseenter={() => onHelpKey?.('heatmap_select')}
				onmouseleave={() => onHelpKey?.(null)}
			>
				<option value="none">Heatmap: Off</option>
				<option value="size">Heatmap: File Size</option>
				<option value="depth">Heatmap: Folder Depth</option>
				<option value="imports">Heatmap: Coupling (Imports)</option>
				<option value="risk">Heatmap: Risk Score</option>
				<option value="composite">Heatmap: Complexity Index</option>
			</select>

			<!-- View Mode Layout Selector -->
			<select
				class="layout-select"
				bind:value={layoutMode}
				title="Change Visualization Layout"
				onmouseenter={() => onHelpKey?.('layout_select')}
				onmouseleave={() => onHelpKey?.(null)}
			>
				<option value="2d">Layout: 2D Plane</option>
				<option value="3d_tower">Layout: 3D Tower</option>
				<option value="3d_sphere">Layout: 3D Sphere</option>
				<option value="3d_cylinder">Layout: 3D Cylinder</option>
			</select>

			<!-- Interactive Help Toggle -->
			<button
				class="zoom-btn {helpModeActive ? 'active-help' : ''}"
				onclick={() => { helpModeActive = !helpModeActive; if (!helpModeActive) { activeHelpKey = null; onHelpKey?.(null); } }}
				title="Toggle Interactive Help Panel"
				style="width: auto; padding: 0 0.55rem; font-size: 0.72rem; font-weight: 600; font-family: var(--font-sans);"
				onmouseenter={() => onHelpKey?.('help_toggle')}
				onmouseleave={() => onHelpKey?.(null)}
			>
				{helpModeActive ? 'Help: On' : 'Help: Off'}
			</button>

			<button class="zoom-btn" onclick={() => handleZoom('in')} title="Zoom In" onmouseenter={() => onHelpKey?.('zoom_in')} onmouseleave={() => onHelpKey?.(null)}>+</button>
			<button class="zoom-btn" onclick={() => handleZoom('out')} title="Zoom Out" onmouseenter={() => onHelpKey?.('zoom_out')} onmouseleave={() => onHelpKey?.(null)}>-</button>
			<button class="zoom-btn" onclick={resetZoom} title="Fit Content" onmouseenter={() => onHelpKey?.('fit_content')} onmouseleave={() => onHelpKey?.(null)}>⛶</button>
		</div>
	</div>

	<div class="visualizer-body">
		{#if !graphData.nodes || graphData.nodes.length === 0}
			<div class="instruction-text">
				<h3>Repository Visualization</h3>
				<p>Enter a GitHub repository URL above to load the visual code landscape structure.</p>
			</div>
		{/if}

		<canvas
			bind:this={canvas}
			style="width: 100%; height: 100%; display: block; cursor: grab;"
			onmousedown={handleMouseDown}
			onmousemove={handleMouseMove}
			onmouseup={handleMouseUp}
			onmouseleave={(e) => { handleMouseUp(); onHelpKey?.(null); }}
			onclick={handleClick}
			onmouseenter={() => onHelpKey?.('canvas')}
		></canvas>

		{#if selectedNode}
			<div
				class="graph-focus-strip"
				role="none"
				onmouseenter={() => onHelpKey?.('focus_strip')}
				onmouseleave={() => onHelpKey?.(null)}
			>
				<div>
					<span class="focus-eyebrow">Focused Node</span>
					<strong>{selectedNode.name}</strong>
					<small>{selectedNode.id}</small>
				</div>
				<div class="focus-strip-metrics">
					<span>{selectedNode.role || selectedNode.type}</span>
					<span>{selectedNode.riskLevel || 'n/a'} risk</span>
					<span>{focusMode}</span>
				</div>
			</div>
		{/if}

		{#if graphData.nodes && graphData.nodes.length > 0}
			<div
				class="legend"
				role="none"
				onmouseenter={() => onHelpKey?.('legend')}
				onmouseleave={() => onHelpKey?.(null)}
			>
				{#if colorMode === 'role'}
					{#each roleLegend as [role, label]}
						<div class="legend-item"><span class="legend-dot" style="background: {roleColors[role]}; box-shadow: 0 0 6px {roleColors[role]};"></span>{label}</div>
					{/each}
				{:else if colorMode === 'risk'}
					<div class="legend-item"><span class="legend-dot" style="background: {riskColors.high}; box-shadow: 0 0 6px {riskColors.high};"></span>High Risk</div>
					<div class="legend-item"><span class="legend-dot" style="background: {riskColors.medium}; box-shadow: 0 0 6px {riskColors.medium};"></span>Medium Risk</div>
					<div class="legend-item"><span class="legend-dot" style="background: {riskColors.low}; box-shadow: 0 0 6px {riskColors.low};"></span>Low Risk</div>
					<div class="legend-item"><span class="legend-dot dot-dir"></span>Directory</div>
				{:else}
					<div class="legend-item"><span class="legend-dot dot-dir"></span>Directory</div>
					<div class="legend-item"><span class="legend-dot dot-file"></span>File</div>
					<div class="legend-item"><span class="legend-dot dot-class"></span>Class</div>
					<div class="legend-item"><span class="legend-dot dot-export"></span>Export</div>
					<div class="legend-item"><span class="legend-dot dot-endpoint"></span>Endpoint</div>
					<div class="legend-item"><span class="legend-dot dot-pkg"></span>Package</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
