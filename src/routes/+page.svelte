<script>
	import GraphCanvas from '$lib/components/GraphCanvas.svelte';
	import InsightPanel from '$lib/components/InsightPanel.svelte';

	// Svelte 5 reactive states
	let graphData = $state({ nodes: [], edges: [] });
	let selectedNode = $state(null);
	let mode = $state('github'); // 'github' or 'local'
	let repoUrl = $state('');
	let githubToken = $state('');
	let localPath = $state('/Users/jasubal/AllMyCoding/CodeGraphViewer');
	let loading = $state(false);
	let error = $state('');
	let warning = $state('');
	let analyzedDetails = $state(null);

	// Fetch repository data from backend API
	async function handleSubmit(event) {
		if (event) event.preventDefault();
		if (mode === 'github' && !repoUrl) return;
		if (mode === 'local' && !localPath) return;

		fetchRepoData(false);
	}

	async function handleLoadDemo() {
		mode = 'github';
		repoUrl = 'demo';
		fetchRepoData(true);
	}

	async function fetchRepoData(loadDemo = false) {
		loading = true;
		error = '';
		warning = '';
		selectedNode = null;
		
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
</script>

<main class="app-container">
	<!-- Glassmorphic Header / Controls -->
	<header class="header">
		<div class="logo-section">
			<h1>Code Landscape Viewer</h1>
			<p>Visualizing repo structures, dependencies, & impact cascades</p>
		</div>

		<form class="form-container" onsubmit={handleSubmit} style="flex-direction: column; gap: 0.75rem; max-width: 65%;">
			<!-- Mode Selector Tabs -->
			<div class="mode-tabs">
				<button 
					class="tab-btn {mode === 'github' ? 'active' : ''}" 
					type="button" 
					onclick={() => { mode = 'github'; error = ''; }}
				>
					GitHub Repo
				</button>
				<button 
					class="tab-btn {mode === 'local' ? 'active' : ''}" 
					type="button" 
					onclick={() => { mode = 'local'; error = ''; }}
				>
					Local Path
				</button>
			</div>

			<div style="display: flex; gap: 0.75rem; width: 100%; align-items: flex-end;">
				{#if mode === 'github'}
					<div class="input-group">
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
					
					<div class="input-group">
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
					<div class="input-group" style="flex: 2;">
						<label class="input-label" for="local-path">Local Directory Path</label>
						<input
							id="local-path"
							class="input-field"
							type="text"
							bind:value={localPath}
							placeholder="/Users/username/project"
							required
							disabled={loading}
						/>
					</div>
				{/if}

				<div style="display: flex; gap: 0.5rem; flex: 1;">
					<button class="submit-btn" type="submit" disabled={loading} style="flex: 1; height: 38px;">
						{#if loading}
							Analyzing...
						{:else}
							Analyze
						{/if}
					</button>
					{#if mode === 'github'}
						<button 
							class="submit-btn" 
							type="button" 
							onclick={handleLoadDemo} 
							disabled={loading} 
							style="background: linear-gradient(135deg, var(--accent-teal) 0%, var(--accent-blue) 100%); flex: 1; height: 38px;"
						>
							Demo
						</button>
					{/if}
				</div>
			</div>
		</form>
	</header>

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
		<div style="flex: 1; position: relative; display: flex; flex-direction: column; min-height: 0;">
			{#if loading}
				<div class="loader-overlay">
					<div class="spinner"></div>
					<div class="loading-text">Fetching & Lexically Analyzing Source Blobs...</div>
				</div>
			{/if}
			
			<GraphCanvas
				{graphData}
				{selectedNode}
				onSelectNode={handleSelectNode}
			/>
		</div>

		<!-- Details/Sidebar Panel -->
		<aside class="sidebar">
			{#if error}
				<div class="card" style="border-color: rgba(239, 68, 68, 0.35); background: rgba(127, 29, 29, 0.2);">
					<div class="card-title" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.15);">
						Analysis Error
					</div>
					<p style="font-size: 0.85rem; color: #fca5a5;">{error}</p>
				</div>
			{/if}

			{#if analyzedDetails}
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
			{/if}

			<InsightPanel {graphData} {selectedNode} />
		</aside>
	</div>
</main>
