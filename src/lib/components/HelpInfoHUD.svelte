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
			title: 'Repository Search',
			description: 'Type names, paths, roles, languages, risk levels, imports, exports, or API endpoints. Matching results appear in a dropdown list.',
			tip: 'Tip: Try searches like api, config, medium, svelte, package, or an imported module name.'
		},
		'heatmap_select': {
			title: 'Metric Heatmap Overlay',
			description: 'Colors and sizes file nodes by File Size, Folder Depth, Coupling, Risk Score, or Composite Complexity.',
			tip: 'Tip: Risk Score highlights files that are large, highly coupled, widely depended on, or sensitive configuration/API surfaces.'
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
		'repo_overview': {
			title: 'Repository Overview',
			description: 'Summarizes repository metadata, detected project type, stack, health metrics, entry points, risk hotspots, and onboarding path.',
			tip: 'Tip: Use this panel before diving into the graph to understand what kind of project you are exploring.'
		},
		'detected_stack': {
			title: 'Detected Stack',
			description: 'Shows frameworks and major libraries inferred from manifests and recognizable project files such as package.json and config files.',
			tip: 'Tip: Detection is deterministic and evidence-based; it avoids claiming technologies that are not visible in the repository.'
		},
		'language_breakdown': {
			title: 'Language Breakdown',
			description: 'Shows the largest languages by byte size across the repository tree after ignored and binary files are filtered.',
			tip: 'Tip: Use this to quickly separate app code, styles, docs, and configuration-heavy repositories.'
		},
		'entry_points': {
			title: 'Entry Points',
			description: 'Highlights likely first files to inspect, such as README, package manifests, framework pages, layouts, or main modules.',
			tip: 'Tip: Clicking an entry point selects the matching graph node and focuses its relationships.'
		},
		'risk_hotspots': {
			title: 'Risk Hotspots',
			description: 'Lists files with elevated maintenance risk based on size, dependency count, dependent count, nesting depth, and sensitive roles.',
			tip: 'Tip: These are review priorities, not automatic defects. Inspect the listed reasons before deciding on refactors.'
		},
		'reading_path': {
			title: 'Suggested Reading Path',
			description: 'Builds a contributor onboarding sequence from README, configuration, entry points, important routes, APIs, components, and tests.',
			tip: 'Tip: Follow the order when onboarding to a repository or preparing context for an AI coding agent.'
		},
		'main_folders': {
			title: 'Main Folders',
			description: 'Ranks top-level folders by file count and summarized risk so the largest areas of the codebase are visible immediately.',
			tip: 'Tip: Large folders are good candidates for architecture-area filtering in future visual views.'
		},
		'smart_explorer': {
			title: 'Smart File Explorer',
			description: 'Lists analyzed files with architecture role, language, size, import count, dependent count, and risk score.',
			tip: 'Tip: Rows are sorted by risk and importance so likely review targets rise to the top.'
		},
		'explorer_search': {
			title: 'Explorer Search',
			description: 'Filters files by name, path, architecture role, language, imports, and exports without changing the graph data.',
			tip: 'Tip: Search for routes, env, config, component, or a package name to narrow the file list.'
		},
		'role_filter': {
			title: 'Architecture Role Filter',
			description: 'Narrows the file explorer to detected roles such as routing, API, components, styles, config, docs, tests, or source.',
			tip: 'Tip: Role filters are inferred from paths and filenames, so they work before adding any AI analysis.'
		},
		'risk_filter': {
			title: 'Risk Filter',
			description: 'Narrows the file explorer by low, medium, or high deterministic maintenance risk.',
			tip: 'Tip: Combine risk with role to find files like high-risk API handlers or medium-risk configuration files.'
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
