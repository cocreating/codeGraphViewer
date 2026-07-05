<script>
	let {
		selectedNode = null,
		recentNodes = [],
		pinnedNodes = [],
		focusMode = 'related',
		canOpenInGitHub = false,
		onSelectPath = null,
		onTogglePin = null,
		onClearRecent = null,
		onFocusModeChange = null,
		onOpenGitHub = null,
		onHoverHelp = null
	} = $props();

	const crumbs = $derived.by(() => {
		if (!selectedNode?.id || selectedNode.id === 'root') return [];
		const targetPath = selectedNode.file || selectedNode.id.split('#')[0];
		const parts = targetPath.split('/').filter(Boolean);
		let current = '';
		return parts.map((part, index) => {
			current = current ? `${current}/${part}` : part;
			return {
				label: part,
				path: current,
				current: index === parts.length - 1
			};
		});
	});

	const isPinned = $derived(Boolean(selectedNode && pinnedNodes.some(node => node.id === selectedNode.id)));

	const focusModes = [
		{ id: 'related', label: 'Related' },
		{ id: 'dependencies', label: 'Dependencies' },
		{ id: 'dependents', label: 'Dependents' },
		{ id: 'sameRole', label: 'Same role' },
		{ id: 'all', label: 'All' }
	];
</script>

<section
	class="card navigation-panel"
	role="none"
	onmouseenter={() => onHoverHelp?.('navigation_panel')}
	onmouseleave={() => onHoverHelp?.(null)}
>
	<div class="card-title">
		Navigation
		{#if selectedNode}
			<span class="node-badge badge-{selectedNode.type}">{selectedNode.type}</span>
		{/if}
	</div>

	{#if selectedNode}
		<div
			class="nav-section"
			role="none"
			onmouseenter={() => onHoverHelp?.('breadcrumbs')}
			onmouseleave={() => onHoverHelp?.('navigation_panel')}
		>
			<div class="input-label">Breadcrumbs</div>
			<div class="breadcrumb-row">
				<button type="button" class="breadcrumb-item" onclick={() => onSelectPath?.('root')}>root</button>
				{#each crumbs as crumb}
					<span class="breadcrumb-separator">/</span>
					<button
						type="button"
						class="breadcrumb-item {crumb.current ? 'active' : ''}"
						onclick={() => onSelectPath?.(crumb.path)}
					>
						{crumb.label}
					</button>
				{/each}
			</div>
		</div>

		<div
			class="nav-section"
			role="none"
			onmouseenter={() => onHoverHelp?.('quick_actions')}
			onmouseleave={() => onHoverHelp?.('navigation_panel')}
		>
			<div class="input-label">Quick Actions</div>
			<div class="quick-action-grid">
				<button type="button" class="nav-action-btn" onclick={() => onFocusModeChange?.('dependencies')}>
					Show dependencies
				</button>
				<button type="button" class="nav-action-btn" onclick={() => onFocusModeChange?.('dependents')}>
					Show dependents
				</button>
				<button type="button" class="nav-action-btn" onclick={() => onFocusModeChange?.('related')}>
					Show related
				</button>
				<button type="button" class="nav-action-btn" onclick={() => onFocusModeChange?.('sameRole')}>
					Same role
				</button>
				<button type="button" class="nav-action-btn" onclick={() => onTogglePin?.(selectedNode)}>
					{isPinned ? 'Unpin file' : 'Pin file'}
				</button>
				<button
					type="button"
					class="nav-action-btn"
					disabled={!canOpenInGitHub}
					onclick={() => onOpenGitHub?.(selectedNode)}
				>
					Open in GitHub
				</button>
			</div>
		</div>
	{:else}
		<div class="metadata-empty">Select a graph node to reveal breadcrumbs and navigation actions.</div>
	{/if}

	<div
		class="nav-section"
		role="none"
		onmouseenter={() => onHoverHelp?.('focus_mode')}
		onmouseleave={() => onHoverHelp?.('navigation_panel')}
	>
		<div class="input-label">Graph Focus Mode</div>
		<div class="focus-mode-grid">
			{#each focusModes as mode}
				<button
					type="button"
					class="focus-mode-btn {focusMode === mode.id ? 'active' : ''}"
					onclick={() => onFocusModeChange?.(mode.id)}
				>
					{mode.label}
				</button>
			{/each}
		</div>
	</div>

	<div class="nav-columns">
		<div
			class="nav-section"
			role="none"
			onmouseenter={() => onHoverHelp?.('recent_files')}
			onmouseleave={() => onHoverHelp?.('navigation_panel')}
		>
			<div class="nav-section-header">
				<div class="input-label">Recent</div>
				{#if recentNodes.length}
					<button type="button" class="inline-link-btn" onclick={() => onClearRecent?.()}>Clear</button>
				{/if}
			</div>
			<div class="nav-list">
				{#each recentNodes.slice(0, 6) as node}
					<button type="button" class="nav-list-item" onclick={() => onSelectPath?.(node.id)}>
						<span>{node.name}</span>
						<small>{node.role || node.type}</small>
					</button>
				{:else}
					<div class="metadata-empty">No recent files yet.</div>
				{/each}
			</div>
		</div>

		<div
			class="nav-section"
			role="none"
			onmouseenter={() => onHoverHelp?.('pinned_files')}
			onmouseleave={() => onHoverHelp?.('navigation_panel')}
		>
			<div class="input-label">Pinned</div>
			<div class="nav-list">
				{#each pinnedNodes.slice(0, 6) as node}
					<button type="button" class="nav-list-item pinned" onclick={() => onSelectPath?.(node.id)}>
						<span>{node.name}</span>
						<small>{node.role || node.type}</small>
					</button>
				{:else}
					<div class="metadata-empty">Pinned files stay here.</div>
				{/each}
			</div>
		</div>
	</div>
</section>
