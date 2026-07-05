<script>
	let {
		graphData = { nodes: [], edges: [] },
		selectedNode = null,
		onSelectNode = null,
		onHoverHelp = null
	} = $props();

	let query = $state('');
	let roleFilter = $state('all');
	let riskFilter = $state('all');

	let files = $derived(graphData.nodes ? graphData.nodes.filter(node => node.type === 'file') : []);
	let roles = $derived([...new Set(files.map(file => file.role).filter(Boolean))].sort());

	let filteredFiles = $derived.by(() => {
		const normalized = query.trim().toLowerCase();
		return files
			.filter(file => roleFilter === 'all' || file.role === roleFilter)
			.filter(file => riskFilter === 'all' || file.riskLevel === riskFilter)
			.filter(file => {
				if (!normalized) return true;
				return [
					file.name,
					file.id,
					file.role,
					file.language,
					...(file.analysis?.imports || []),
					...(file.analysis?.exports || [])
				].filter(Boolean).some(value => String(value).toLowerCase().includes(normalized));
			})
			.sort((a, b) => {
				if ((b.riskScore || 0) !== (a.riskScore || 0)) return (b.riskScore || 0) - (a.riskScore || 0);
				return (b.importanceScore || 0) - (a.importanceScore || 0);
			})
			.slice(0, 80);
	});

	const formatSize = (bytes = 0) => {
		if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
		if (bytes > 1024) return `${Math.round(bytes / 1024)} KB`;
		return `${bytes} B`;
	};
</script>

<section
	class="card smart-explorer"
	role="none"
	onmouseenter={() => onHoverHelp?.('smart_explorer')}
	onmouseleave={() => onHoverHelp?.(null)}
>
	<div class="card-title">
		Smart File Explorer
		<span class="node-badge badge-file">{filteredFiles.length}/{files.length}</span>
	</div>

	<div class="explorer-controls">
		<input
			class="input-field explorer-search"
			type="search"
			bind:value={query}
			placeholder="Filter files, paths, imports..."
			onmouseenter={() => onHoverHelp?.('explorer_search')}
			onmouseleave={() => onHoverHelp?.('smart_explorer')}
		/>
		<div class="explorer-selects">
			<select
				class="heatmap-select"
				bind:value={roleFilter}
				aria-label="Filter by architecture role"
				onmouseenter={() => onHoverHelp?.('role_filter')}
				onmouseleave={() => onHoverHelp?.('smart_explorer')}
			>
				<option value="all">All roles</option>
				{#each roles as role}
					<option value={role}>{role}</option>
				{/each}
			</select>
			<select
				class="heatmap-select"
				bind:value={riskFilter}
				aria-label="Filter by risk"
				onmouseenter={() => onHoverHelp?.('risk_filter')}
				onmouseleave={() => onHoverHelp?.('smart_explorer')}
			>
				<option value="all">All risk</option>
				<option value="high">High risk</option>
				<option value="medium">Medium risk</option>
				<option value="low">Low risk</option>
			</select>
		</div>
	</div>

	<div class="explorer-list">
		{#each filteredFiles as file}
			<button
				type="button"
				class="explorer-row {selectedNode?.id === file.id ? 'active' : ''}"
				onclick={() => onSelectNode?.(file)}
			>
				<div class="explorer-main">
					<span class="risk-dot risk-{file.riskLevel}" title={`${file.riskLevel} risk`}></span>
					<div>
						<strong>{file.name}</strong>
						<small>{file.id}</small>
					</div>
				</div>
				<div class="explorer-meta">
					<span>{file.role}</span>
					<span>{file.language}</span>
					<span>{formatSize(file.size)}</span>
					<span>{file.importsCount || 0} in</span>
					<span>{file.dependentsCount || 0} used</span>
					<strong>{file.riskScore || 0}</strong>
				</div>
			</button>
		{/each}

		{#if filteredFiles.length === 0}
			<div class="metadata-empty">No files match the current filters.</div>
		{/if}
	</div>
</section>
