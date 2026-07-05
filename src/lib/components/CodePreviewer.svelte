<script>
	import { onDestroy, untrack } from 'svelte';
	import { gsap } from 'gsap';
	import Prism from 'prismjs';
	
	// Import Prism stylesheet tomorrow theme
	import 'prismjs/themes/prism-tomorrow.css';

	let { 
		selectedNode = null, 
		show = false, 
		onClose,
		mode = 'local',
		localPath = '',
		repoUrl = '',
		githubToken = ''
	} = $props();

	let backdropEl = $state(null);
	let drawerEl = $state(null);
	
	let codeContent = $state('');
	let loading = $state(false);
	let errorMsg = $state('');

	// Map file extensions to Prism core languages (javascript, css, markup, clike)
	const getPrismLanguage = (ext) => {
		switch (ext) {
			case '.js':
			case '.jsx':
			case '.ts':
			case '.tsx':
			case '.json':
			case '.mjs':
			case '.cjs':
				return 'javascript';
			case '.css':
				return 'css';
			case '.html':
			case '.svelte':
				return 'markup';
			default:
				return 'clike';
		}
	};

	// Helper to escape HTML fallback
	function escapeHtml(text) {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	// Dynamic derived syntax highlight computation
	let highlightedHtml = $derived.by(() => {
		if (!codeContent) return '';
		const ext = selectedNode?.ext || '';
		const lang = getPrismLanguage(ext);
		if (Prism.languages[lang]) {
			return Prism.highlight(codeContent, Prism.languages[lang], lang);
		}
		return escapeHtml(codeContent);
	});

	// Trigger slide-in animation when 'show' becomes true
	$effect(() => {
		if (show && selectedNode && selectedNode.type === 'file') {
			// Trigger fetch
			fetchContent();
			
			// Slide in drawer and fade in backdrop
			untrack(() => {
				if (drawerEl && backdropEl) {
					gsap.killTweensOf([drawerEl, backdropEl]);
					
					// Set display properties inline first via Svelte style bindings, then tween
					gsap.fromTo(backdropEl, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power1.out' });
					gsap.fromTo(drawerEl, { x: '100%' }, { x: '0%', duration: 0.45, ease: 'power2.out' });
				}
			});
		}
	});

	async function fetchContent() {
		if (!selectedNode) return;
		loading = true;
		errorMsg = '';
		codeContent = '';

		try {
			const res = await fetch('/api/get-file-content', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					mode,
					localPath,
					filePath: selectedNode.id,
					repoUrl,
					githubToken
				})
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || 'Failed to load file contents');
			}
			codeContent = data.content || '';
		} catch (err) {
			errorMsg = err.message;
		} finally {
			loading = false;
		}
	}

	// Trigger slide-out animation before calling onClose callback
	const handleClose = () => {
		if (drawerEl && backdropEl) {
			gsap.killTweensOf([drawerEl, backdropEl]);
			
			gsap.to(backdropEl, { opacity: 0, duration: 0.3, ease: 'power1.in' });
			gsap.to(drawerEl, { 
				x: '100%', 
				duration: 0.38, 
				ease: 'power2.in', 
				onComplete: () => {
					onClose();
				} 
			});
		} else {
			onClose();
		}
	};
</script>

<div 
	bind:this={backdropEl} 
	class="preview-backdrop" 
	style="display: {show ? 'block' : 'none'}; opacity: 0;"
	onclick={handleClose}
	onkeydown={(e) => e.key === 'Escape' && handleClose()}
	role="button"
	tabindex="0"
	aria-label="Close Preview"
></div>

<div 
	bind:this={drawerEl} 
	class="preview-drawer" 
	style="transform: translate3d(100%, 0, 0); display: {show ? 'flex' : 'none'};"
>
	{#if selectedNode}
		<div class="preview-header">
			<div class="preview-title-section">
				<div class="preview-title" title={selectedNode.name}>
					<span class="legend-dot dot-file" style="margin-right: 0.4rem; scale: 0.9;"></span>
					{selectedNode.name}
				</div>
				<div class="preview-path" title={selectedNode.id}>{selectedNode.id}</div>
			</div>
			
			<button class="preview-close-btn" onclick={handleClose} aria-label="Close file viewer">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width: 1.1rem; height: 1.1rem;">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<div class="preview-content">
			{#if loading}
				<div style="margin: auto; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; color: var(--accent-purple);">
					<div class="loading-spinner"></div>
					<span style="font-family: var(--font-sans); font-size: 0.8rem; font-weight: 500;">Fetching file source...</span>
				</div>
			{:else if errorMsg}
				<div style="margin: auto; max-width: 80%; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; text-align: center;">
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.0" stroke="#ef4444" style="width: 2.25rem; height: 2.25rem;">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
					</svg>
					<span style="font-family: var(--font-sans); font-size: 0.85rem; color: #ef4444; font-weight: 500;">{errorMsg}</span>
				</div>
			{:else}
				<pre class="preview-code-wrapper"><code class="language-{getPrismLanguage(selectedNode.ext || '')}">{@html highlightedHtml}</code></pre>
			{/if}
		</div>
	{/if}
</div>
