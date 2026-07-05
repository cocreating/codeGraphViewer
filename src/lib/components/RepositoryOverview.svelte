<script>
	let {
		repo = null,
		summary = null,
		detectedTech = [],
		languageBreakdown = [],
		entryPoints = [],
		mainFolders = [],
		health = null,
		highRiskFiles = [],
		readingPath = [],
		onSelectPath = null,
		onHoverHelp = null
	} = $props();

	const compactNumber = (value) => {
		if (value === null || value === undefined) return 'n/a';
		return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
	};

	const formatDate = (value) => {
		if (!value) return 'n/a';
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? 'n/a' : date.toLocaleDateString();
	};
</script>

<section
	class="card repo-overview"
	role="none"
	onmouseenter={() => onHoverHelp?.('repo_overview')}
	onmouseleave={() => onHoverHelp?.(null)}
>
	<div class="card-title">
		Repository Overview
		{#if summary?.projectType}
			<span class="node-badge badge-file">{summary.projectType}</span>
		{/if}
	</div>

	<div class="overview-header">
		<div>
			<div class="overview-name">{repo?.fullName || repo?.name || 'Repository'}</div>
			{#if repo?.description}
				<div class="overview-description">{repo.description}</div>
			{/if}
		</div>
		{#if repo?.url}
			<a class="overview-link" href={repo.url} target="_blank" rel="noreferrer">GitHub</a>
		{/if}
	</div>

	<div class="overview-metrics">
		<div class="metric-pill"><span>Stars</span><strong>{compactNumber(repo?.stars)}</strong></div>
		<div class="metric-pill"><span>Forks</span><strong>{compactNumber(repo?.forks)}</strong></div>
		<div class="metric-pill"><span>Issues</span><strong>{compactNumber(repo?.openIssues)}</strong></div>
		<div class="metric-pill"><span>License</span><strong>{repo?.license || 'n/a'}</strong></div>
		<div class="metric-pill"><span>Activity</span><strong>{formatDate(repo?.lastActivity)}</strong></div>
		<div class="metric-pill"><span>Branch</span><strong>{repo?.defaultBranch || 'local'}</strong></div>
	</div>

	{#if summary?.architecture}
		<p class="overview-summary">{summary.architecture}</p>
	{/if}

	<div class="overview-health">
		<div>
			<div class="stat-value">{health?.complexityScore ?? 0}</div>
			<div class="stat-label">Complexity</div>
		</div>
		<div>
			<div class="stat-value">{health?.importEdges ?? 0}</div>
			<div class="stat-label">Imports</div>
		</div>
		<div>
			<div class="stat-value">{health?.packageCount ?? 0}</div>
			<div class="stat-label">Packages</div>
		</div>
		<div>
			<div class="stat-value">{health?.analysisCoverage ?? 0}%</div>
			<div class="stat-label">Parsed</div>
		</div>
	</div>

	{#if detectedTech.length}
		<div
			class="overview-section"
			role="none"
			onmouseenter={() => onHoverHelp?.('detected_stack')}
			onmouseleave={() => onHoverHelp?.('repo_overview')}
		>
			<div class="input-label">Detected Stack</div>
			<div class="chip-row">
				{#each detectedTech as tech}
					<span class="info-chip">{tech}</span>
				{/each}
			</div>
		</div>
	{/if}

	{#if languageBreakdown.length}
		<div
			class="overview-section"
			role="none"
			onmouseenter={() => onHoverHelp?.('language_breakdown')}
			onmouseleave={() => onHoverHelp?.('repo_overview')}
		>
			<div class="input-label">Language Breakdown</div>
			<div class="language-bars">
				{#each languageBreakdown.slice(0, 5) as item}
					<div class="language-row">
						<span>{item.language}</span>
						<div class="language-track"><span style="width: {Math.max(2, item.percent)}%;"></span></div>
						<strong>{item.percent}%</strong>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div class="overview-columns">
		{#if entryPoints.length}
			<div
				class="overview-section"
				role="none"
				onmouseenter={() => onHoverHelp?.('entry_points')}
				onmouseleave={() => onHoverHelp?.('repo_overview')}
			>
				<div class="input-label">Entry Points</div>
				<div class="compact-list">
					{#each entryPoints as file}
						<button type="button" class="compact-list-item" onclick={() => onSelectPath?.(file)}>{file}</button>
					{/each}
				</div>
			</div>
		{/if}

		{#if highRiskFiles.length}
			<div
				class="overview-section"
				role="none"
				onmouseenter={() => onHoverHelp?.('risk_hotspots')}
				onmouseleave={() => onHoverHelp?.('repo_overview')}
			>
				<div class="input-label">Risk Hotspots</div>
				<div class="compact-list">
					{#each highRiskFiles.slice(0, 5) as file}
						<button type="button" class="compact-list-item risk-{file.riskLevel}" onclick={() => onSelectPath?.(file.id)}>
							<span>{file.name}</span>
							<strong>{file.riskScore}</strong>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	{#if readingPath.length}
		<div
			class="overview-section"
			role="none"
			onmouseenter={() => onHoverHelp?.('reading_path')}
			onmouseleave={() => onHoverHelp?.('repo_overview')}
		>
			<div class="input-label">Suggested Reading Path</div>
			<div class="reading-path">
				{#each readingPath.slice(0, 6) as step, index}
					<button type="button" class="reading-step" onclick={() => onSelectPath?.(step.path)}>
						<span>{index + 1}</span>
						<div>
							<strong>{step.path}</strong>
							<small>{step.reason}</small>
						</div>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if mainFolders.length}
		<div
			class="overview-section"
			role="none"
			onmouseenter={() => onHoverHelp?.('main_folders')}
			onmouseleave={() => onHoverHelp?.('repo_overview')}
		>
			<div class="input-label">Main Folders</div>
			<div class="folder-grid">
				{#each mainFolders.slice(0, 6) as folder}
					<div class="folder-chip">
						<strong>{folder.folder}</strong>
						<span>{folder.files} files</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</section>
