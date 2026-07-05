<script>
	let { graphData = { nodes: [], edges: [] }, selectedNode = null, onViewCode, onHoverHelp = null } = $props();

	// Helper to resolve string source/target IDs from D3 edge objects
	const getSourceId = (edge) => typeof edge.source === 'object' ? edge.source.id : edge.source;
	const getTargetId = (edge) => typeof edge.target === 'object' ? edge.target.id : edge.target;

	// 1. Direct dependencies (outgoing import links)
	let directDependencies = $derived.by(() => {
		if (!selectedNode || !graphData.edges) return [];
		return graphData.edges
			.filter(edge => getSourceId(edge) === selectedNode.id && edge.type === 'import')
			.map(edge => graphData.nodes.find(n => n.id === getTargetId(edge)))
			.filter(Boolean);
	});

	// 2. Direct dependents (incoming import links)
	let directDependents = $derived.by(() => {
		if (!selectedNode || !graphData.edges) return [];
		return graphData.edges
			.filter(edge => getTargetId(edge) === selectedNode.id && edge.type === 'import')
			.map(edge => graphData.nodes.find(n => n.id === getSourceId(edge)))
			.filter(Boolean);
	});

	// 3. Impact radius (BFS reachability following incoming import links)
	let impactNodes = $derived.by(() => {
		if (!selectedNode || !graphData.edges) return [];
		const visited = new Set();
		const queue = [selectedNode.id];

		while (queue.length > 0) {
			const current = queue.shift();
			graphData.edges.forEach(edge => {
				const sId = getSourceId(edge);
				const tId = getTargetId(edge);
				if (tId === current && edge.type === 'import' && !visited.has(sId) && sId !== selectedNode.id) {
					visited.add(sId);
					queue.push(sId);
				}
			});
		}
		return Array.from(visited).map(id => graphData.nodes.find(n => n.id === id)).filter(Boolean);
	});

	// 4. Subtree file count (for directory nodes)
	let subtreeFilesCount = $derived.by(() => {
		if (!selectedNode || selectedNode.type !== 'directory' || !graphData.edges) return 0;
		const visited = new Set();
		const queue = [selectedNode.id];

		while (queue.length > 0) {
			const current = queue.shift();
			graphData.edges.forEach(edge => {
				const sId = getSourceId(edge);
				const tId = getTargetId(edge);
				if (sId === current && edge.type === 'hierarchy' && !visited.has(tId)) {
					visited.add(tId);
					queue.push(tId);
				}
			});
		}
		return Array.from(visited).filter(id => {
			const node = graphData.nodes.find(n => n.id === id);
			return node && node.type === 'file';
		}).length;
	});

	// 5. Total code stats for the selected file (classes, exports, endpoints, imports)
	let codeAnalysis = $derived(selectedNode && selectedNode.analysis ? selectedNode.analysis : null);
</script>

<div 
	class="card" 
	style="flex: 1; display: flex; flex-direction: column; min-height: 0;"
	role="none"
	onmouseenter={() => onHoverHelp?.('insights_panel')}
	onmouseleave={() => onHoverHelp?.(null)}
>
	<div class="card-title">
		Code Insights Panel
		{#if selectedNode}
			<span class="node-badge badge-{selectedNode.type}">{selectedNode.type}</span>
		{/if}
	</div>

	{#if !selectedNode}
		<div class="metadata-empty" style="margin: auto; padding: 2rem;">
			Click any node in the graph visualization to explore its relationships, metrics, and semantic details.
		</div>
	{:else}
		<div class="node-details" style="flex: 1; display: flex; flex-direction: column; gap: 1rem; overflow-y: auto;">
			<!-- Node Header info -->
			<div>
				<div class="node-name">{selectedNode.name}</div>
				{#if selectedNode.id !== 'root'}
					<div class="node-path">{selectedNode.id}</div>
				{/if}
				{#if selectedNode.type === 'file'}
					<button 
						class="preview-code-btn"
						onclick={onViewCode}
						onmouseenter={(e) => { e.stopPropagation(); onHoverHelp?.('preview_btn'); }}
						onmouseleave={(e) => { e.stopPropagation(); onHoverHelp?.('insights_panel'); }}
						style="width: 100%; margin-top: 0.65rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.45rem; background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 6px; color: #d8b4fe; font-family: var(--font-sans); font-size: 0.75rem; font-weight: 600; cursor: pointer;"
					>
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.2" stroke="currentColor" style="width: 0.85rem; height: 0.85rem;">
							<path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
						</svg>
						View Source Code
					</button>
				{/if}
			</div>

			<!-- Core Metrics Grid -->
			<div class="stats-grid">
				<div class="stat-card" title="Direct files this node references">
					<div class="stat-value">{directDependencies.length}</div>
					<div class="stat-label">Dependencies</div>
				</div>
				<div class="stat-card" title="Direct files referencing this node">
					<div class="stat-value">{directDependents.length}</div>
					<div class="stat-label">Dependents</div>
				</div>
				<div class="stat-card" title="Total downstream nodes impacted by changes to this node">
					<div class="stat-value">{selectedNode.type === 'directory' ? subtreeFilesCount : impactNodes.length}</div>
					<div class="stat-label">{selectedNode.type === 'directory' ? 'Subtree Files' : 'Impact Radius'}</div>
				</div>
			</div>

			<!-- Semantic Lexical Content for Code Files -->
			{#if selectedNode.type === 'file' && codeAnalysis}
				<div>
					<div class="input-label" style="margin-bottom: 0.35rem;">Code Component Summary</div>
					<div class="stats-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 0.75rem;">
						<div class="stat-card" style="padding: 0.35rem;">
							<div class="stat-value" style="font-size: 0.95rem;">{codeAnalysis.classesCount}</div>
							<div class="stat-label" style="font-size: 0.5rem;">Classes</div>
						</div>
						<div class="stat-card" style="padding: 0.35rem;">
							<div class="stat-value" style="font-size: 0.95rem;">{codeAnalysis.exportsCount}</div>
							<div class="stat-label" style="font-size: 0.5rem;">Exports</div>
						</div>
						<div class="stat-card" style="padding: 0.35rem;">
							<div class="stat-value" style="font-size: 0.95rem;">{codeAnalysis.importsCount}</div>
							<div class="stat-label" style="font-size: 0.5rem;">Imports</div>
						</div>
						<div class="stat-card" style="padding: 0.35rem;">
							<div class="stat-value" style="font-size: 0.95rem;">{codeAnalysis.endpointsCount}</div>
							<div class="stat-label" style="font-size: 0.5rem;">Endpoints</div>
						</div>
					</div>
				</div>

				{#if codeAnalysis.endpoints && codeAnalysis.endpoints.length > 0}
					<div>
						<div class="input-label" style="margin-bottom: 0.35rem;">Exported HTTP Endpoints</div>
						<div class="metadata-list">
							{#each codeAnalysis.endpoints as endpoint}
								<div class="metadata-item" style="border-left-color: var(--accent-orange);">
									<span style="color: var(--accent-orange); font-weight: bold;">{endpoint.split(' ')[0]}</span>
									<span style="color: var(--text-primary);">{endpoint.split(' ').slice(1).join(' ')}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if codeAnalysis.classes && codeAnalysis.classes.length > 0}
					<div>
						<div class="input-label" style="margin-bottom: 0.35rem;">Defined Classes</div>
						<div class="metadata-list">
							{#each codeAnalysis.classes as cls}
								<div class="metadata-item" style="border-left-color: var(--accent-yellow);">
									<span>{cls}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if codeAnalysis.exports && codeAnalysis.exports.length > 0}
					<div>
						<div class="input-label" style="margin-bottom: 0.35rem;">Named Exports</div>
						<div class="metadata-list">
							{#each codeAnalysis.exports as exp}
								{#if !codeAnalysis.classes.includes(exp)}
									<div class="metadata-item" style="border-left-color: var(--accent-pink);">
										<span>{exp}</span>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/if}
			{/if}

			<!-- Dependencies List -->
			{#if directDependencies.length > 0}
				<div>
					<div class="input-label" style="margin-bottom: 0.35rem;">Direct Dependencies</div>
					<div class="metadata-list">
						{#each directDependencies as dep}
							<div class="metadata-item" style="border-left-color: var(--accent-blue);">
								<span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{dep.name}</span>
								<span style="color: var(--text-muted); font-size: 0.65rem;">{dep.type}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Dependents List -->
			{#if directDependents.length > 0}
				<div>
					<div class="input-label" style="margin-bottom: 0.35rem;">Direct Dependents</div>
					<div class="metadata-list">
						{#each directDependents as dep}
							<div class="metadata-item" style="border-left-color: var(--accent-teal);">
								<span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{dep.name}</span>
								<span style="color: var(--text-muted); font-size: 0.65rem;">{dep.type}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Impact Path list -->
			{#if selectedNode.type === 'file' && impactNodes.length > 0}
				<div>
					<div class="input-label" style="margin-bottom: 0.35rem; color: var(--accent-pink);">Dependent Reachability (Impact Cascade)</div>
					<div class="metadata-list" style="border-color: rgba(236, 72, 153, 0.25);">
						{#each impactNodes as node}
							<div class="metadata-item" style="border-left-color: var(--accent-purple);">
								<span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{node.name}</span>
								<span style="color: var(--text-muted); font-size: 0.65rem;">{node.type}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
