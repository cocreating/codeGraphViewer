<script>
	import { onMount, untrack } from 'svelte';
	import GraphCanvas from '$lib/components/GraphCanvas.svelte';
	import InsightPanel from '$lib/components/InsightPanel.svelte';
	import CodePreviewer from '$lib/components/CodePreviewer.svelte';
	import HelpInfoHUD from '$lib/components/HelpInfoHUD.svelte';
	import RepositoryOverview from '$lib/components/RepositoryOverview.svelte';
	import SmartExplorer from '$lib/components/SmartExplorer.svelte';
	import NavigationPanel from '$lib/components/NavigationPanel.svelte';
	import { DEFAULT_APP_CONFIG, getDefaultLocalRepository } from '$lib/config/defaults.js';

	const defaultLocalRepository = getDefaultLocalRepository();
	const localRepoPresets = DEFAULT_APP_CONFIG.localRepositories;

	// Svelte 5 reactive states
	let graphData = $state({ nodes: [], edges: [] });
	let selectedNode = $state(null);
	let showCodePreview = $state(false);
	let recentNodes = $state([]);
	let pinnedNodeIds = $state([]);
	let focusMode = $state(DEFAULT_APP_CONFIG.defaultFocusMode);
	let activeInspectorTab = $state('overview');
	let inspectorCollapsed = $state(false);

	// Help Info panel states
	let helpModeActive = $state(false);
	let activeHelpKey = $state(null);

	function handleHelpKey(key) {
		if (helpModeActive) {
			activeHelpKey = key;
		}
	}

	let mode = $state(DEFAULT_APP_CONFIG.defaultMode); // 'github' or 'local'
	let repoUrl = $state('');
	let githubToken = $state('');
	let localPath = $state(defaultLocalRepository?.path || '');
	let localRepoPreset = $state(defaultLocalRepository?.id || 'custom');
	let localBrowserOpen = $state(false);
	let localBrowserPath = $state(defaultLocalRepository?.path || '');
	let localBrowserEntries = $state([]);
	let localBrowserRoots = $state([]);
	let localBrowserParentPath = $state(null);
	let localBrowserLoading = $state(false);
	let localBrowserError = $state('');
	let loading = $state(false);
	let error = $state('');
	let warning = $state('');
	let analyzedDetails = $state(null);

	// Reset code preview drawer when node selection changes
	$effect(() => {
		const node = selectedNode;
		untrack(() => {
			if (!node) {
				showCodePreview = false;
			}
		});
	});

	// Fetch repository data from backend API
	async function handleSubmit(event) {
		if (event) event.preventDefault();
		if (mode === 'github' && !repoUrl) return;
		if (mode === 'local' && !localPath) return;

		fetchRepoData(false);
	}

	async function handleLoadDemo() {
		mode = 'local';
		localPath = defaultLocalRepository?.path || '';
		localRepoPreset = defaultLocalRepository?.id || 'custom';
		fetchRepoData(false);
	}

	function handleLocalRepoPresetChange() {
		const preset = localRepoPresets.find(item => item.id === localRepoPreset);
		if (preset?.path) {
			localPath = preset.path;
		}
	}

	async function openLocalBrowser() {
		localBrowserOpen = true;
		await browseLocalDirectory(localPath || defaultLocalRepository?.path || '');
	}

	function closeLocalBrowser() {
		localBrowserOpen = false;
		localBrowserError = '';
	}

	async function browseLocalDirectory(nextPath) {
		localBrowserLoading = true;
		localBrowserError = '';

		try {
			const params = nextPath ? `?path=${encodeURIComponent(nextPath)}` : '';
			const response = await fetch(`/api/browse-local${params}`);
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Could not read local directory');
			}

			localBrowserPath = data.currentPath;
			localBrowserEntries = data.entries || [];
			localBrowserRoots = data.roots || [];
			localBrowserParentPath = data.parentPath || null;
		} catch (err) {
			localBrowserError = err.message || 'Could not read local directory';
			localBrowserEntries = [];
		} finally {
			localBrowserLoading = false;
		}
	}

	function useBrowsedDirectory() {
		localPath = localBrowserPath;
		syncLocalRepoPresetFromPath();
		closeLocalBrowser();
	}

	async function fetchRepoData(loadDemo = false) {
		loading = true;
		error = '';
		warning = '';
		selectedNode = null;
		recentNodes = [];
		pinnedNodeIds = [];
		focusMode = DEFAULT_APP_CONFIG.defaultFocusMode;

		try {
			const response = await fetch('/api/analyze-github', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mode, repoUrl, githubToken, localPath, loadDemo })
			});

			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.error || 'Failed to analyze repository');
			}

			// If backend returned warning or loadDemo is set
			if (data.error && data.demo) {
				warning = data.error; // rate limit message
			} else if (data.demo) {
				warning = 'Loaded Code Landscape Viewer own codebase as interactive demo.';
			}

			graphData = data;

			// Compute overall repo summary stats
			const files = data.nodes.filter(n => n.type === 'file');
			const dirs = data.nodes.filter(n => n.type === 'directory');
			analyzedDetails = {
				fileCount: files.length,
				dirCount: dirs.length,
				totalNodes: data.nodes.length,
				totalEdges: data.edges.length
			};
		} catch (err) {
			error = err.message || 'An unexpected error occurred';
			graphData = { nodes: [], edges: [] };
			analyzedDetails = null;
		} finally {
			loading = false;
		}
	}

	// Update selected node
	function handleSelectNode(node) {
		selectedNode = node;
	}

	function handleSelectPath(path) {
		const node = graphData.nodes.find(item => item.id === path);
		if (node) selectedNode = node;
	}

	function normalizeNodePath(node) {
		if (!node) return '';
		return node.file || (node.id ? node.id.split('#')[0] : '');
	}

	let pinnedNodes = $derived(
		pinnedNodeIds
			.map(id => graphData.nodes.find(node => node.id === id))
			.filter(Boolean)
	);

	let canOpenInGitHub = $derived(Boolean(graphData.repo?.url && selectedNode && selectedNode.id !== 'root'));

	$effect(() => {
		const node = selectedNode;
		untrack(() => {
			if (!node || node.id === 'root') return;
			recentNodes = [node, ...recentNodes.filter(item => item.id !== node.id)].slice(0, 10);
			activeInspectorTab = 'selected';
			inspectorCollapsed = false;
		});
	});

	function togglePinnedNode(node) {
		if (!node || node.id === 'root') return;
		if (pinnedNodeIds.includes(node.id)) {
			pinnedNodeIds = pinnedNodeIds.filter(id => id !== node.id);
		} else {
			pinnedNodeIds = [node.id, ...pinnedNodeIds].slice(0, 12);
		}
	}

	function clearRecentNodes() {
		recentNodes = [];
	}

	function handleFocusModeChange(nextMode) {
		focusMode = nextMode;
	}

	function syncLocalRepoPresetFromPath() {
		const matchingPreset = localRepoPresets.find(item => item.path && item.path === localPath);
		localRepoPreset = matchingPreset?.id || 'custom';
	}

	function getGitHubNodeUrl(node) {
		const repoBase = graphData.repo?.url;
		const path = normalizeNodePath(node);
		if (!repoBase || !path) return null;
		const branch = graphData.repo?.defaultBranch || 'main';
		const viewType = node.type === 'directory' ? 'tree' : 'blob';
		return `${repoBase}/${viewType}/${branch}/${path}`;
	}

	function openInGitHub(node) {
		const url = getGitHubNodeUrl(node);
		if (url) window.open(url, '_blank', 'noopener,noreferrer');
	}

	function selectInspectorTab(tabId) {
		activeInspectorTab = tabId;
		inspectorCollapsed = false;
	}

	onMount(() => {
		if (mode === 'local' && localPath) {
			fetchRepoData(false);
		}
	});
</script>

<main class="app-container">
	<!-- Glassmorphic Header / Controls -->
	<header class="header">
		<div class="logo-section">
			<h1>Code Landscape Viewer</h1>
			<p>Visualizing repo structures, dependencies, & impact cascades</p>
		</div>

		<form class="form-container" onsubmit={handleSubmit}>
			<!-- Mode Selector Tabs -->
			<div class="mode-tabs">
				<button
					class="tab-btn {mode === 'local' ? 'active' : ''}"
					type="button"
					onclick={() => { mode = 'local'; error = ''; }}
					onmouseenter={() => handleHelpKey('local_tab')}
					onmouseleave={() => handleHelpKey(null)}
				>
					Local Repo
				</button>
				<button
					class="tab-btn {mode === 'github' ? 'active' : ''}"
					type="button"
					onclick={() => { mode = 'github'; error = ''; }}
					onmouseenter={() => handleHelpKey('github_tab')}
					onmouseleave={() => handleHelpKey(null)}
				>
					GitHub Repo
				</button>
			</div>

			<div class="repo-source-row">
				{#if mode === 'github'}
					<div
						class="input-group"
						role="none"
						onmouseenter={() => handleHelpKey('github_tab')}
						onmouseleave={() => handleHelpKey(null)}
					>
						<label class="input-label" for="repo-url">GitHub Repo URL</label>
						<input
							id="repo-url"
							class="input-field"
							type="url"
							bind:value={repoUrl}
							placeholder="https://github.com/sveltejs/template"
							required={repoUrl !== 'demo'}
							disabled={loading}
						/>
					</div>

					<div
						class="input-group"
						role="none"
						onmouseenter={() => handleHelpKey('github_tab')}
						onmouseleave={() => handleHelpKey(null)}
					>
						<label class="input-label" for="git-pat">GitHub PAT (Optional)</label>
						<input
							id="git-pat"
							class="input-field"
							type="password"
							bind:value={githubToken}
							placeholder="ghp_..."
							disabled={loading}
						/>
					</div>
				{:else}
					<div class="local-repo-controls">
						<div
							class="input-group"
							role="none"
							onmouseenter={() => handleHelpKey('local_repo_select')}
							onmouseleave={() => handleHelpKey(null)}
						>
							<label class="input-label" for="local-repo-preset">Local Repo</label>
							<select
								id="local-repo-preset"
								class="input-field local-select"
								bind:value={localRepoPreset}
								onchange={handleLocalRepoPresetChange}
								disabled={loading}
							>
								{#each localRepoPresets as preset}
									<option value={preset.id}>{preset.label}</option>
								{/each}
							</select>
						</div>

						<div
							class="input-group"
							role="none"
							onmouseenter={() => handleHelpKey('local_tab')}
							onmouseleave={() => handleHelpKey(null)}
						>
							<label class="input-label" for="local-path">Local Directory Path</label>
							<div class="local-path-row">
								<input
									id="local-path"
									class="input-field"
									type="text"
									bind:value={localPath}
									oninput={syncLocalRepoPresetFromPath}
									placeholder="/Users/username/project"
									required
									disabled={loading}
								/>
								<button
									class="browse-btn"
									type="button"
									onclick={openLocalBrowser}
									disabled={loading}
									aria-label="Browse local folders"
									onmouseenter={() => handleHelpKey('local_browser')}
									onmouseleave={() => handleHelpKey(null)}
								>
									Browse
								</button>
							</div>
						</div>
					</div>
				{/if}

				<div class="analysis-actions">
					<button
						class="submit-btn"
						type="submit"
						disabled={loading}
						onmouseenter={() => handleHelpKey('analyze_btn')}
						onmouseleave={() => handleHelpKey(null)}
					>
						{#if loading}
							Analyzing...
						{:else}
							Analyze
						{/if}
					</button>
					{#if mode === 'local'}
						<button
						class="submit-btn"
						type="button"
						onclick={handleLoadDemo}
						disabled={loading}
							data-variant="example"
							onmouseenter={() => handleHelpKey('demo_btn')}
							onmouseleave={() => handleHelpKey(null)}
						>
							Example
						</button>
					{/if}
				</div>
			</div>
		</form>
	</header>

	{#if localBrowserOpen}
		<div
			class="folder-browser-backdrop"
			role="presentation"
			onclick={(event) => {
				if (event.currentTarget === event.target) closeLocalBrowser();
			}}
		>
			<div
				class="folder-browser"
				role="dialog"
				aria-modal="true"
				aria-labelledby="folder-browser-title"
			>
				<header class="folder-browser-header">
					<div>
						<p class="folder-browser-kicker">Local Folder Navigator</p>
						<h2 id="folder-browser-title">Select repository folder</h2>
					</div>
					<button class="folder-browser-close" type="button" onclick={closeLocalBrowser} aria-label="Close folder browser">
						x
					</button>
				</header>

				<div class="folder-browser-current">
					<span>{localBrowserPath}</span>
				</div>

				<div class="folder-browser-roots" aria-label="Quick folder roots">
					{#each localBrowserRoots as root}
						<button type="button" onclick={() => browseLocalDirectory(root.path)}>
							{root.name}
						</button>
					{/each}
				</div>

				{#if localBrowserError}
					<p class="folder-browser-error">{localBrowserError}</p>
				{/if}

				<div class="folder-browser-list" aria-busy={localBrowserLoading}>
					{#if localBrowserLoading}
						<p class="folder-browser-empty">Loading folders...</p>
					{:else}
						{#if localBrowserParentPath}
							<button class="folder-row parent" type="button" onclick={() => browseLocalDirectory(localBrowserParentPath)}>
								<span class="folder-icon">..</span>
								<span>Parent directory</span>
							</button>
						{/if}

						{#each localBrowserEntries as entry}
							<button
								class="folder-row"
								class:muted={!entry.readable}
								type="button"
								disabled={!entry.readable}
								onclick={() => browseLocalDirectory(entry.path)}
							>
								<span class="folder-icon">[]</span>
								<span>{entry.name}</span>
								{#if entry.hidden}
									<span class="folder-badge">hidden</span>
								{/if}
								{#if !entry.readable}
									<span class="folder-badge">locked</span>
								{/if}
							</button>
						{/each}

						{#if !localBrowserParentPath && localBrowserEntries.length === 0}
							<p class="folder-browser-empty">No readable folders found here.</p>
						{/if}
					{/if}
				</div>

				<footer class="folder-browser-actions">
					<button class="secondary-btn" type="button" onclick={closeLocalBrowser}>Cancel</button>
					<button class="submit-btn" type="button" onclick={useBrowsedDirectory} disabled={!localBrowserPath}>
						Use This Folder
					</button>
				</footer>
			</div>
		</div>
	{/if}

	<!-- Warning Alert Banner -->
	{#if warning}
		<div class="card" style="border-color: rgba(234, 179, 8, 0.3); background: rgba(234, 179, 8, 0.1); padding: 0.75rem 1.25rem;">
			<p style="font-size: 0.85rem; color: #fef08a; text-align: center;">
				⚠️ {warning}
			</p>
		</div>
	{/if}

	<!-- Main Workspace Split -->
	<div class="workspace">
		<!-- Simulation Visualization -->
		<div class="canvas-stage">
			{#if loading}
				<div class="loader-overlay">
					<div class="spinner"></div>
					<div class="loading-text">Fetching & Lexically Analyzing Source Blobs...</div>
				</div>
			{/if}

			<GraphCanvas
				{graphData}
				{selectedNode}
				{focusMode}
				onSelectNode={handleSelectNode}
				onHelpKey={handleHelpKey}
				bind:helpModeActive={helpModeActive}
				bind:activeHelpKey={activeHelpKey}
			/>

			<!-- Floating Help Information Card HUD Overlay -->
			<HelpInfoHUD
				active={helpModeActive}
				activeKey={activeHelpKey}
			/>

			<aside
				class="floating-inspector {inspectorCollapsed ? 'collapsed' : ''}"
				onmouseenter={() => handleHelpKey('floating_inspector')}
				onmouseleave={() => handleHelpKey(null)}
			>
				<header class="inspector-header">
					<div>
						<p class="inspector-kicker">Repository Inspector</p>
						<h2>{selectedNode?.name || graphData.repo?.name || graphData.summary?.projectType || 'Workspace'}</h2>
					</div>
					<button
						class="inspector-toggle"
						type="button"
						onclick={() => inspectorCollapsed = !inspectorCollapsed}
						aria-label={inspectorCollapsed ? 'Expand inspector' : 'Collapse inspector'}
					>
						{inspectorCollapsed ? 'Open' : 'Hide'}
					</button>
				</header>

				{#if !inspectorCollapsed}
					<nav class="inspector-tabs" aria-label="Inspector sections">
						<button
							type="button"
							class:active={activeInspectorTab === 'overview'}
							onclick={() => selectInspectorTab('overview')}
						>
							Overview
						</button>
						<button
							type="button"
							class:active={activeInspectorTab === 'explorer'}
							onclick={() => selectInspectorTab('explorer')}
						>
							Explorer
						</button>
						<button
							type="button"
							class:active={activeInspectorTab === 'selected'}
							onclick={() => selectInspectorTab('selected')}
						>
							Selected
						</button>
						<button
							type="button"
							class:active={activeInspectorTab === 'navigation'}
							onclick={() => selectInspectorTab('navigation')}
						>
							Nav
						</button>
					</nav>

					<div class="inspector-body">
						{#if error}
							<div class="card analysis-error-card">
								<div class="card-title">Analysis Error</div>
								<p>{error}</p>
							</div>
						{/if}

						{#if activeInspectorTab === 'overview'}
							{#if graphData.summary}
								<RepositoryOverview
									repo={graphData.repo}
									summary={graphData.summary}
									detectedTech={graphData.detectedTech}
									languageBreakdown={graphData.languageBreakdown}
									entryPoints={graphData.entryPoints}
									mainFolders={graphData.mainFolders}
									health={graphData.health}
									highRiskFiles={graphData.highRiskFiles}
									readingPath={graphData.readingPath}
									onSelectPath={handleSelectPath}
									onHoverHelp={handleHelpKey}
								/>
							{:else if analyzedDetails}
								<div class="card">
									<div class="card-title">Repository Landscape Statistics</div>
									<div class="stats-grid">
										<div class="stat-card">
											<div class="stat-value">{analyzedDetails.fileCount}</div>
											<div class="stat-label">Source Files</div>
										</div>
										<div class="stat-card">
											<div class="stat-value">{analyzedDetails.dirCount}</div>
											<div class="stat-label">Directories</div>
										</div>
										<div class="stat-card">
											<div class="stat-value">{analyzedDetails.totalEdges}</div>
											<div class="stat-label">Graph Links</div>
										</div>
									</div>
								</div>
							{:else}
								<div class="metadata-empty inspector-empty">Analyze a repository to populate the overview.</div>
							{/if}
						{:else if activeInspectorTab === 'explorer'}
							<SmartExplorer
								{graphData}
								{selectedNode}
								onSelectNode={handleSelectNode}
								onHoverHelp={handleHelpKey}
							/>
						{:else if activeInspectorTab === 'selected'}
							<InsightPanel
								{graphData}
								{selectedNode}
								{focusMode}
								onViewCode={() => showCodePreview = true}
								onFocusModeChange={handleFocusModeChange}
								onOpenGitHub={openInGitHub}
								canOpenInGitHub={canOpenInGitHub}
								onHoverHelp={handleHelpKey}
							/>
						{:else if activeInspectorTab === 'navigation'}
							<NavigationPanel
								{selectedNode}
								{recentNodes}
								{pinnedNodes}
								{focusMode}
								{canOpenInGitHub}
								onSelectPath={handleSelectPath}
								onTogglePin={togglePinnedNode}
								onClearRecent={clearRecentNodes}
								onFocusModeChange={handleFocusModeChange}
								onOpenGitHub={openInGitHub}
								onHoverHelp={handleHelpKey}
							/>
						{/if}
					</div>
				{/if}
			</aside>
		</div>
	</div>

	<CodePreviewer
		{selectedNode}
		show={showCodePreview}
		onClose={() => showCodePreview = false}
		{mode}
		{localPath}
		{repoUrl}
		{githubToken}
	/>
</main>
