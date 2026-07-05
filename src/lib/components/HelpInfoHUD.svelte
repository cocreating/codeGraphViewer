<script>
	import { fade, fly } from 'svelte/transition';

	let { 
		activeKey = null, 
		active = $bindable(false) 
	} = $props();

	// Hover content mapping dictionary
	const helpContent = {
		'help_toggle': {
			title: 'Interactive Help Mode',
			description: 'Toggles the Interactive Help Card. When enabled, pointing your cursor at any UI element reveals its function and shortcuts.',
			tip: 'Tip: Turn this off once you are familiar with the interface to clear up viewport space.'
		},
		'github_tab': {
			title: 'GitHub Analysis Mode',
			description: 'Allows you to analyze any public GitHub repository. It downloads files, resolves imports, and builds the visual dependency landscape.',
			tip: 'Tip: You can optionally paste a GitHub PAT to increase API rate limits.'
		},
		'local_tab': {
			title: 'Local Directory Mode',
			description: 'Allows you to analyze any directory on your local computer. Scans files and builds the dependency graph locally.',
			tip: 'Tip: Ensure the directory path is absolute (e.g. /Users/name/my-project).'
		},
		'analyze_btn': {
			title: 'Start Analysis',
			description: 'Triggers the repository analysis backend. Gathers file statistics, parses Javascript/Svelte AST imports, and lays out the graph simulation.',
			tip: 'Tip: Small repos load instantly, large ones may take up to 2-3 seconds.'
		},
		'demo_btn': {
			title: 'Load Codebase Demo',
			description: 'Loads this application\'s own codebase as a live interactive demo so you can explore all features right away.',
			tip: 'Tip: Great for exploring search, complexity heatmap, and 3D layout morphs.'
		},
		'search_bar': {
			title: 'Fuzzy Symbol Search',
			description: 'Type names of files, modules, classes, or API endpoints. Matches results in a dropdown list.',
			tip: 'Tip: Selecting a match centers the camera on it and highlights its dependencies.'
		},
		'heatmap_select': {
			title: 'Complexity Heatmap Overlay',
			description: 'Colors and sizes file nodes dynamically based on metrics: File Size, Nesting Depth, Coupling, or Composite Complexity.',
			tip: 'Tip: Fades folders and packages so you can instantly pinpoint complex files.'
		},
		'layout_select': {
			title: 'Constellation Layouts',
			description: 'Morphs nodes smoothly between layout geometries: 2D Plane, stacked 3D Tower, Fibonacci 3D Sphere, or helical 3D Cylinder.',
			tip: 'Tip: Changing layouts plays a smooth GSAP morph animation.'
		},
		'zoom_in': {
			title: 'Zoom In',
			description: 'Scales the visualization closer, allowing you to read file names and trace specific import edges.',
			tip: 'Tip: You can also use the mouse wheel or trackpad pinch-to-zoom.'
		},
		'zoom_out': {
			title: 'Zoom Out',
			description: 'Scales the viewport out, providing a wider view of the repository\'s overall galaxy structure.',
			tip: 'Tip: Helps you see the main cluster shapes and directory packages.'
		},
		'fit_content': {
			title: 'Fit Content',
			description: 'Resets the camera scale and center to fit the entire repository constellation perfectly inside the canvas.',
			tip: 'Tip: Clears any active selection focus transitions.'
		},
		'canvas': {
			title: 'Interactive Galaxy Viewport',
			description: 'Shows directories and files. In 2D, you can pan and drag nodes. In 3D, dragging rotates the camera around the constellation.',
			tip: 'Tip: Selecting a node dims unrelated elements, accelerating packet particles on imports.'
		},
		'legend': {
			title: 'Node Type Legend',
			description: 'Identifies node types by color: Teal (Directory), Blue (File), Yellow (Class), Pink (Named Export), Orange (HTTP Endpoint), Green (Package).',
			tip: 'Tip: Hovering over nodes on the canvas displays their type badge in the sidebar.'
		},
		'stats_card': {
			title: 'Repository Statistics',
			description: 'Displays overall codebase metrics: total analyzed source files, subfolders, and direct reference edges.',
			tip: 'Tip: Stat counts update reactively whenever a new workspace or repo is parsed.'
		},
		'insights_panel': {
			title: 'Code Insights Panel',
			description: 'Displays direct dependencies (outgoing), direct dependents (incoming), impact radius, classes, exports, and API endpoints.',
			tip: 'Tip: Selecting a file lets you inspect its exact references and code metrics.'
		},
		'preview_btn': {
			title: 'View Source Code',
			description: 'Opens a slide-out glassmorphic panel containing the file\'s source code with full syntax highlighting.',
			tip: 'Tip: Clicking the dark backdrop or the close button slides it out of view.'
		}
	};
</script>

{#if active}
	<div 
		class="help-hud-card"
		transition:fly={{ y: 15, duration: 250 }}
	>
		<div class="help-hud-header">
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="var(--accent-purple)" style="width: 1rem; height: 1rem; flex-shrink: 0;">
				<path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
			</svg>
			<span>Interactive Help Guide</span>
		</div>
		
		<div class="help-hud-content">
			{#if activeKey && helpContent[activeKey]}
				<div in:fade={{ duration: 150 }}>
					<h4 class="help-hud-title">{helpContent[activeKey].title}</h4>
					<p class="help-hud-desc">{helpContent[activeKey].description}</p>
					<p class="help-hud-tip">{helpContent[activeKey].tip}</p>
				</div>
			{:else}
				<div in:fade={{ duration: 150 }} style="color: var(--text-muted); font-size: 0.72rem; line-height: 1.45;">
					Hover over any button, input field, layout selector, or sidebar panel to see its purpose and interactive features.
				</div>
			{/if}
		</div>
	</div>
{/if}
