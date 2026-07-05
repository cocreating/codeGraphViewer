import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

const demoNodes = [
	{ id: 'root', name: 'CodeGraphViewer', type: 'root' },
	{ id: 'package.json', name: 'package.json', type: 'file', ext: '.json', size: 466 },
	{ id: 'vite.config.js', name: 'vite.config.js', type: 'file', ext: '.js', size: 747 },
	{ id: 'src', name: 'src', type: 'directory' },
	{ id: 'src/app.css', name: 'app.css', type: 'file', ext: '.css', size: 13745 },
	{ id: 'src/routes', name: 'routes', type: 'directory' },
	{ id: 'src/routes/+layout.svelte', name: '+layout.svelte', type: 'file', ext: '.svelte', size: 2690 },
	{ id: 'src/routes/+page.svelte', name: '+page.svelte', type: 'file', ext: '.svelte', size: 16190, analysis: { classesCount: 0, exportsCount: 0, importsCount: 2, endpointsCount: 0, classes: [], exports: [], imports: ['$lib/components/GraphCanvas.svelte', '$lib/components/InsightPanel.svelte'], endpoints: [] } },
	{ id: 'src/routes/api', name: 'api', type: 'directory' },
	{ id: 'src/routes/api/analyze-github', name: 'analyze-github', type: 'directory' },
	{ id: 'src/routes/api/analyze-github/+server.js', name: '+server.js', type: 'file', ext: '.js', size: 23385, analysis: { classesCount: 0, exportsCount: 1, importsCount: 1, endpointsCount: 1, classes: [], exports: ['POST'], imports: ['@sveltejs/kit'], endpoints: ['POST /api/analyze-github'] } },
	{ id: 'src/lib', name: 'lib', type: 'directory' },
	{ id: 'src/lib/components', name: 'components', type: 'directory' },
	{ id: 'src/lib/components/GraphCanvas.svelte', name: 'GraphCanvas.svelte', type: 'file', ext: '.svelte', size: 31144, analysis: { classesCount: 1, exportsCount: 2, importsCount: 2, endpointsCount: 0, classes: ['ForceSimulation'], exports: ['getNodeRadius', 'getNodeColor'], imports: ['d3', 'svelte'], endpoints: [] } },
	{ id: 'src/lib/components/InsightPanel.svelte', name: 'InsightPanel.svelte', type: 'file', ext: '.svelte', size: 1920, analysis: { classesCount: 0, exportsCount: 0, importsCount: 0, endpointsCount: 0, classes: [], exports: [], imports: [], endpoints: [] } },
	
	// Inner structures
	{ id: 'src/routes/api/analyze-github/+server.js#endpoint:POST:/api/analyze-github', name: 'POST /api/analyze-github', type: 'endpoint', file: 'src/routes/api/analyze-github/+server.js' },
	{ id: 'src/lib/components/GraphCanvas.svelte#class:ForceSimulation', name: 'ForceSimulation', type: 'class', file: 'src/lib/components/GraphCanvas.svelte' },
	{ id: 'src/lib/components/GraphCanvas.svelte#export:getNodeRadius', name: 'getNodeRadius', type: 'export', file: 'src/lib/components/GraphCanvas.svelte' },
	{ id: 'src/lib/components/GraphCanvas.svelte#export:getNodeColor', name: 'getNodeColor', type: 'export', file: 'src/lib/components/GraphCanvas.svelte' },
	
	// Packages
	{ id: 'pkg:d3', name: 'd3', type: 'package' },
	{ id: 'pkg:@sveltejs/kit', name: '@sveltejs/kit', type: 'package' }
];

const demoEdges = [
	{ source: 'root', target: 'package.json', type: 'hierarchy' },
	{ source: 'root', target: 'vite.config.js', type: 'hierarchy' },
	{ source: 'root', target: 'src', type: 'hierarchy' },
	{ source: 'src', target: 'src/app.css', type: 'hierarchy' },
	{ source: 'src', target: 'src/routes', type: 'hierarchy' },
	{ source: 'src/routes', target: 'src/routes/+layout.svelte', type: 'hierarchy' },
	{ source: 'src/routes', target: 'src/routes/+page.svelte', type: 'hierarchy' },
	{ source: 'src/routes', target: 'src/routes/api', type: 'hierarchy' },
	{ source: 'src/routes/api', target: 'src/routes/api/analyze-github', type: 'hierarchy' },
	{ source: 'src/routes/api/analyze-github', target: 'src/routes/api/analyze-github/+server.js', type: 'hierarchy' },
	
	{ source: 'src', target: 'src/lib', type: 'hierarchy' },
	{ source: 'src/lib', target: 'src/lib/components', type: 'hierarchy' },
	{ source: 'src/lib/components', target: 'src/lib/components/GraphCanvas.svelte', type: 'hierarchy' },
	{ source: 'src/lib/components', target: 'src/lib/components/InsightPanel.svelte', type: 'hierarchy' },
	
	// Containments
	{ source: 'src/routes/api/analyze-github/+server.js', target: 'src/routes/api/analyze-github/+server.js#endpoint:POST:/api/analyze-github', type: 'contains' },
	{ source: 'src/lib/components/GraphCanvas.svelte', target: 'src/lib/components/GraphCanvas.svelte#class:ForceSimulation', type: 'contains' },
	{ source: 'src/lib/components/GraphCanvas.svelte', target: 'src/lib/components/GraphCanvas.svelte#export:getNodeRadius', type: 'contains' },
	{ source: 'src/lib/components/GraphCanvas.svelte', target: 'src/lib/components/GraphCanvas.svelte#export:getNodeColor', type: 'contains' },
	
	// Imports
	{ source: 'src/routes/+page.svelte', target: 'src/lib/components/GraphCanvas.svelte', type: 'import' },
	{ source: 'src/routes/+page.svelte', target: 'src/lib/components/InsightPanel.svelte', type: 'import' },
	{ source: 'src/routes/api/analyze-github/+server.js', target: 'pkg:@sveltejs/kit', type: 'import' },
	{ source: 'src/lib/components/GraphCanvas.svelte', target: 'pkg:d3', type: 'import' }
];

// Helper to recursively walk local directories
function walkLocalDir(dir, baseDir = dir) {
	const results = [];
	let list;
	try {
		list = fs.readdirSync(dir);
	} catch (e) {
		console.warn(`Cannot read local directory ${dir}:`, e.message);
		return [];
	}
	
	for (let file of list) {
		if (
			file === 'node_modules' || 
			file === '.git' || 
			file === '.svelte-kit' || 
			file === 'dist' || 
			file === 'build' ||
			file === 'vendor' ||
			file === '__pycache__' ||
			file === '.vscode' ||
			file === '.idea' ||
			file.startsWith('.')
		) continue;
		
		const fullPath = path.resolve(dir, file);
		const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
		
		let stat;
		try {
			stat = fs.statSync(fullPath);
		} catch (e) {
			continue;
		}
		
		if (stat.isDirectory()) {
			results.push({
				path: relativePath,
				type: 'tree'
			});
			results.push(...walkLocalDir(fullPath, baseDir));
		} else {
			results.push({
				path: relativePath,
				type: 'blob',
				size: stat.size,
				fullPath
			});
		}
	}
	return results;
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		const { mode = 'github', repoUrl, githubToken, localPath, loadDemo = false } = await request.json();

		// Handle explicit demo request or empty demo URL
		if (loadDemo || repoUrl === 'demo') {
			return json({ nodes: demoNodes, edges: edgesToGraph(demoNodes, demoEdges), demo: true });
		}

		let rawItems = [];
		let rootName = '';

		if (mode === 'local') {
			// Resolve absolute path for local analysis
			const targetDir = path.resolve(localPath || process.cwd());
			if (!fs.existsSync(targetDir)) {
				return json({ error: `Local directory does not exist: ${targetDir}` }, { status: 400 });
			}
			
			const stat = fs.statSync(targetDir);
			if (!stat.isDirectory()) {
				return json({ error: `Path is not a directory: ${targetDir}` }, { status: 400 });
			}

			rootName = path.basename(targetDir) || 'local-repo';
			rawItems = walkLocalDir(targetDir, targetDir);
		} else {
			// GitHub mode
			if (!repoUrl) {
				return json({ error: 'Repository URL is required' }, { status: 400 });
			}

			// Clean and parse URL
			const cleanUrl = repoUrl.trim().replace(/\/$/, '').replace(/\.git$/, '');
			const match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
			if (!match) {
				return json({ error: 'Invalid GitHub repository URL' }, { status: 400 });
			}

			const owner = match[1];
			const repo = match[2];
			rootName = repo;

			// Set up request headers
			const headers = {
				'Accept': 'application/vnd.github.v3+json',
				'User-Agent': 'Code-Landscape-Viewer'
			};
			if (githubToken) {
				headers['Authorization'] = `token ${githubToken}`;
			}

			// Fetch repository default branch
			let repoRes;
			try {
				repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
			} catch (fetchErr) {
				return json({ 
					error: 'GitHub API is unreachable. Fallback demo loaded instead.',
					nodes: demoNodes,
					edges: demoEdges,
					demo: true
				});
			}

			if (!repoRes.ok) {
				const errorText = await repoRes.text();
				if (repoRes.status === 403 || repoRes.status === 401) {
					return json({ 
						error: `GitHub API error (${repoRes.status}): Rate limit exceeded. Loaded local app codebase as interactive demo instead!`,
						nodes: demoNodes,
						edges: demoEdges,
						demo: true
					});
				}
				return json({ error: `Failed to fetch repo: ${repoRes.statusText || errorText}` }, { status: repoRes.status });
			}
			
			const repoData = await repoRes.json();
			const defaultBranch = repoData.default_branch || 'main';

			// Fetch Git tree recursively
			const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, { headers });
			if (!treeRes.ok) {
				if (treeRes.status === 403) {
					return json({ 
						error: 'GitHub API rate limit exceeded on tree fetch. Loaded local app codebase as interactive demo instead!',
						nodes: demoNodes,
						edges: demoEdges,
						demo: true
					});
				}
				return json({ error: `Failed to fetch repository tree: ${treeRes.statusText}` }, { status: treeRes.status });
			}
			const treeData = await treeRes.json();

			if (!treeData.tree || !Array.isArray(treeData.tree)) {
				return json({ error: 'Empty or invalid repository structure' }, { status: 400 });
			}

			const isIgnored = (path) => {
				const parts = path.split('/');
				return parts.some(part => 
					part === '.git' ||
					part === 'node_modules' ||
					part === '.svelte-kit' ||
					part === 'dist' ||
					part === 'build' ||
					part === 'vendor' ||
					part === '__pycache__' ||
					part === '.vscode' ||
					part === '.idea' ||
					part.startsWith('.')
				);
			};

			const isBinary = (path) => {
				const binaryExtensions = [
					'.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.svg',
					'.woff', '.woff2', '.ttf', '.eot',
					'.mp3', '.mp4', '.wav', '.avi', '.mov',
					'.zip', '.tar', '.gz', '.rar', '.7z',
					'.pdf', '.epub', '.docx', '.xlsx', '.pptx',
					'.db', '.sqlite', '.exe', '.dll', '.so', '.dylib', '.wasm'
				];
				const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
				return binaryExtensions.includes(ext) || path.endsWith('package-lock.json') || path.endsWith('yarn.lock') || path.endsWith('pnpm-lock.yaml');
			};

			rawItems = treeData.tree.filter(item => !isIgnored(item.path) && !isBinary(item.path));
		}

		// Limit the graph size if the codebase is extremely large
		const MAX_GRAPH_NODES = 120;
		let prunedTree = rawItems;
		if (rawItems.length > MAX_GRAPH_NODES) {
			const targetExtensions = ['.js', '.ts', '.svelte', '.py', '.php', '.jsx', '.tsx', '.mjs', '.cjs'];
			const dirs = rawItems.filter(item => item.type === 'tree');
			const code = rawItems.filter(item => {
				if (item.type !== 'blob') return false;
				const ext = item.path.slice(item.path.lastIndexOf('.')).toLowerCase();
				return targetExtensions.includes(ext);
			});
			const others = rawItems.filter(item => !dirs.includes(item) && !code.includes(item));
			prunedTree = [...dirs, ...code, ...others].slice(0, MAX_GRAPH_NODES);
		}

		const nodes = [];
		const edges = [];
		const seenDirs = new Set();
		seenDirs.add('root');

		// Create root repository node
		nodes.push({ id: 'root', name: rootName, type: 'root' });

		// Populate base nodes and hierarchical structure
		for (const item of prunedTree) {
			const path = item.path;
			const parts = path.split('/');
			const name = parts[parts.length - 1];
			const type = item.type === 'tree' ? 'directory' : 'file';

			// Ensure all parent directories exist
			let currentPath = '';
			for (let i = 0; i < parts.length - 1; i++) {
				const part = parts[i];
				currentPath = currentPath ? `${currentPath}/${part}` : part;
				if (!seenDirs.has(currentPath)) {
					nodes.push({ id: currentPath, name: part, type: 'directory' });
					seenDirs.add(currentPath);
					const grandParent = currentPath.includes('/') 
						? currentPath.slice(0, currentPath.lastIndexOf('/')) 
						: 'root';
					edges.push({ source: grandParent, target: currentPath, type: 'hierarchy' });
				}
			}

			// Add the node itself
			if (type === 'directory') {
				if (!seenDirs.has(path)) {
					nodes.push({ id: path, name, type: 'directory' });
					seenDirs.add(path);
					const parentId = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : 'root';
					edges.push({ source: parentId, target: path, type: 'hierarchy' });
				}
			} else {
				const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
				nodes.push({ id: path, name, type: 'file', ext, size: item.size || 0 });
				const parentId = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : 'root';
				edges.push({ source: parentId, target: path, type: 'hierarchy' });
			}
		}

		// Identify code files for lexical analysis
		const targetExtensions = ['.js', '.ts', '.svelte', '.py', '.php', '.jsx', '.tsx', '.mjs', '.cjs'];
		const codeFiles = prunedTree.filter(item => {
			if (item.type !== 'blob') return false;
			const ext = item.path.slice(item.path.lastIndexOf('.')).toLowerCase();
			return targetExtensions.includes(ext);
		});

		const MAX_ANALYZED_FILES = 30;
		const filesToAnalyze = codeFiles.slice(0, MAX_ANALYZED_FILES);
		const allFilePaths = prunedTree.filter(i => i.type === 'blob').map(i => i.path);

		const packageNodes = new Set();

		if (mode === 'local') {
			// Analyze local files synchronously/directly (extremely fast)
			for (const file of filesToAnalyze) {
				try {
					if (!file.fullPath) continue;
					const content = fs.readFileSync(file.fullPath, 'utf8');
					const analysis = analyzeCode(content, file.path);
					processAnalysisResults(file.path, analysis, nodes, edges, allFilePaths, packageNodes);
				} catch (err) {
					console.error(`Error reading local file ${file.path}:`, err);
				}
			}
		} else {
			// GitHub mode (fetch chunks asynchronously)
			const headers = {
				'Accept': 'application/vnd.github.v3+json',
				'User-Agent': 'Code-Landscape-Viewer'
			};
			if (githubToken) {
				headers['Authorization'] = `token ${githubToken}`;
			}

			const concurrency = 6;
			for (let i = 0; i < filesToAnalyze.length; i += concurrency) {
				const chunk = filesToAnalyze.slice(i, i + concurrency);
				await Promise.all(chunk.map(async (file) => {
					try {
						const content = await fetchFileContent(owner, repo, file.sha, headers);
						const analysis = analyzeCode(content, file.path);
						processAnalysisResults(file.path, analysis, nodes, edges, allFilePaths, packageNodes);
					} catch (err) {
						console.error(`Error analyzing remote file ${file.path}:`, err);
					}
				}));
			}
		}

		return json({ nodes, edges });
	} catch (error) {
		console.error('Server error analyzing repo:', error);
		return json({ error: error.message || 'Internal Server Error' }, { status: 500 });
	}
}

// Function to process and map analysis results into nodes/edges list
function processAnalysisResults(filePath, analysis, nodes, edges, allFilePaths, packageNodes) {
	const fileDir = filePath.includes('/') ? filePath.slice(0, filePath.lastIndexOf('/')) : '';

	// Find the file node to append data
	const fileNode = nodes.find(n => n.id === filePath);
	if (fileNode) {
		fileNode.analysis = {
			classesCount: analysis.classes.length,
			exportsCount: analysis.exports.length,
			importsCount: analysis.imports.length,
			endpointsCount: analysis.endpoints.length,
			classes: analysis.classes,
			exports: analysis.exports,
			imports: analysis.imports,
			endpoints: analysis.endpoints.map(ep => `${ep.method} ${ep.route}`)
		};
	}

	// Add Class nodes and contains edges
	analysis.classes.forEach(cls => {
		const classId = `${filePath}#class:${cls}`;
		nodes.push({ id: classId, name: cls, type: 'class', file: filePath });
		edges.push({ source: filePath, target: classId, type: 'contains' });
	});

	// Add Endpoint nodes and contains edges
	analysis.endpoints.forEach(ep => {
		const epId = `${filePath}#endpoint:${ep.method}:${ep.route}`;
		nodes.push({ id: epId, name: `${ep.method} ${ep.route}`, type: 'endpoint', file: filePath });
		edges.push({ source: filePath, target: epId, type: 'contains' });
	});

	// Add Export nodes (filter out duplicates of classes)
	analysis.exports.forEach(exp => {
		if (analysis.classes.includes(exp)) return;
		const expId = `${filePath}#export:${exp}`;
		nodes.push({ id: expId, name: exp, type: 'export', file: filePath });
		edges.push({ source: filePath, target: expId, type: 'contains' });
	});

	// Add Import edges and package nodes
	analysis.imports.forEach(imp => {
		const resolved = resolveImportPath(imp, fileDir, allFilePaths);
		if (resolved) {
			if (resolved.type === 'file') {
				edges.push({ source: filePath, target: resolved.id, type: 'import' });
			} else if (resolved.type === 'package') {
				const pkgId = `pkg:${resolved.id}`;
				if (!packageNodes.has(pkgId)) {
					packageNodes.add(pkgId);
					nodes.push({ id: pkgId, name: resolved.id, type: 'package' });
				}
				edges.push({ source: filePath, target: pkgId, type: 'import' });
			}
		}
	});
}

// Simple helper to shape edges
function edgesToGraph(nodes, edges) {
	return edges;
}

async function fetchFileContent(owner, repo, sha, headers) {
	const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`, {
		headers: {
			...headers,
			'Accept': 'application/vnd.github.raw'
		}
	});
	if (!res.ok) {
		throw new Error(`Failed to fetch blob: ${res.statusText}`);
	}
	return await res.text();
}

function resolveImportPath(importStr, fileDir, allFiles) {
	// Standardize SvelteKit lib imports
	if (importStr.startsWith('$lib/')) {
		const target = importStr.replace('$lib/', 'src/lib/');
		return findMatchingFile(target, allFiles);
	}
	if (importStr.startsWith('.') || importStr.startsWith('..')) {
		const resolvedParts = [];
		const dirParts = fileDir ? fileDir.split('/') : [];
		const importParts = importStr.split('/');
		
		const combinedParts = [...dirParts, ...importParts];
		for (const part of combinedParts) {
			if (part === '.' || part === '') continue;
			if (part === '..') {
				resolvedParts.pop();
			} else {
				resolvedParts.push(part);
			}
		}
		const target = resolvedParts.join('/');
		return findMatchingFile(target, allFiles);
	}
	// NPM package or other dependency
	return { type: 'package', id: importStr };
}

function findMatchingFile(targetPath, allFiles) {
	if (allFiles.includes(targetPath)) return { type: 'file', id: targetPath };
	
	const exts = ['.js', '.ts', '.svelte', '.py', '.php', '.jsx', '.tsx', '.mjs', '.cjs'];
	for (const ext of exts) {
		const full = targetPath + ext;
		if (allFiles.includes(full)) return { type: 'file', id: full };
		
		const indexFile = `${targetPath}/index${ext}`;
		if (allFiles.includes(indexFile)) return { type: 'file', id: indexFile };
	}
	return null;
}

function analyzeCode(content, path) {
	const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
	const imports = [];
	const exports = [];
	const classes = [];
	const endpoints = [];

	const isJsLike = ['.js', '.ts', '.svelte', '.jsx', '.tsx', '.mjs', '.cjs'].includes(ext);
	const isPython = ext === '.py';
	const isPhp = ext === '.php';

	if (isJsLike) {
		// Imports
		const importRegex = /import\s+(?:type\s+)?[\s\S]*?from\s+['"]([^'"]+)['"]/g;
		let match;
		while ((match = importRegex.exec(content)) !== null) {
			imports.push(match[1]);
		}
		const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;
		while ((match = dynamicImportRegex.exec(content)) !== null) {
			imports.push(match[1]);
		}
		const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
		while ((match = requireRegex.exec(content)) !== null) {
			imports.push(match[1]);
		}

		// Exports
		const exportNamedRegex = /\bexport\s+(?:async\s+)?(?:const|let|var|function|class|interface|type)\s+([a-zA-Z0-9_$]+)/g;
		while ((match = exportNamedRegex.exec(content)) !== null) {
			exports.push(match[1]);
		}
		const exportBlockRegex = /\bexport\s*\{([\s\S]*?)\}/g;
		while ((match = exportBlockRegex.exec(content)) !== null) {
			const inner = match[1];
			const items = inner.split(',').map(x => {
				const parts = x.trim().split(/\s+as\s+/);
				return parts[parts.length - 1].trim();
			}).filter(Boolean);
			exports.push(...items);
		}
		if (/\bexport\s+default\b/.test(content)) {
			exports.push('default');
		}

		// Classes
		const classRegex = /\bclass\s+([a-zA-Z0-9_$]+)/g;
		while ((match = classRegex.exec(content)) !== null) {
			classes.push(match[1]);
		}

		// SvelteKit endpoints
		const isSvelteKitRoute = path.includes('/src/routes/') || path.includes('/routes/');
		const isServerFile = path.endsWith('+server.js') || path.endsWith('+server.ts') || path.endsWith('+page.server.js') || path.endsWith('+page.server.ts');
		if (isSvelteKitRoute && isServerFile) {
			const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
			let routePath = '/';
			const routeMatch = path.match(/(?:src\/routes|routes)\/(.+?)\/\+[^/]+$/);
			if (routeMatch) {
				routePath = '/' + routeMatch[1].replace(/\/\([^)]+\)/g, ''); // strip group layouts e.g., (app)
			}
			
			for (const method of methods) {
				const methodRegex = new RegExp(`\\bexport\\s+(?:async\\s+)?(?:const|function)\\s+${method}\\b`);
				if (methodRegex.test(content)) {
					endpoints.push({ method, route: routePath });
				}
			}
		}
	} else if (isPython) {
		// Imports
		const importRegex = /^\s*import\s+([a-zA-Z0-9_,\s]+)/gm;
		let match;
		while ((match = importRegex.exec(content)) !== null) {
			const modules = match[1].split(',').map(x => x.trim());
			imports.push(...modules);
		}
		const fromImportRegex = /^\s*from\s+([a-zA-Z0-9_\.]+)\s+import/gm;
		while ((match = fromImportRegex.exec(content)) !== null) {
			imports.push(match[1]);
		}

		// Classes
		const classRegex = /^\s*class\s+([a-zA-Z0-9_$]+)/gm;
		while ((match = classRegex.exec(content)) !== null) {
			classes.push(match[1]);
		}

		// Exports (def functions)
		const funcRegex = /^def\s+([a-zA-Z0-9_$]+)\s*\(/gm;
		while ((match = funcRegex.exec(content)) !== null) {
			exports.push(match[1]);
		}

		// Endpoints (FastAPI, Flask style routing decorators)
		const routeRegex = /@(?:app|router)\.(get|post|put|delete|patch|route)\(\s*['"]([^'"]+)['"]/g;
		while ((match = routeRegex.exec(content)) !== null) {
			endpoints.push({ method: match[1].toUpperCase(), route: match[2] });
		}
	} else if (isPhp) {
		// Imports
		const phpRequireRegex = /(?:require|include)(?:_once)?\s*\(?\s*['"]([^'"]+)['"]/g;
		let match;
		while ((match = phpRequireRegex.exec(content)) !== null) {
			imports.push(match[1]);
		}
		const phpUseRegex = /\buse\s+([^;]+);/g;
		while ((match = phpUseRegex.exec(content)) !== null) {
			imports.push(match[1].trim());
		}

		// Classes
		const classRegex = /\bclass\s+([a-zA-Z0-9_$]+)/g;
		while ((match = classRegex.exec(content)) !== null) {
			classes.push(match[1]);
		}

		// Exports (functions)
		const funcRegex = /\bfunction\s+([a-zA-Z0-9_$]+)\s*\(/g;
		while ((match = funcRegex.exec(content)) !== null) {
			exports.push(match[1]);
		}

		// Endpoints (Laravel routing style)
		const routeRegex = /Route::(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/g;
		while ((match = routeRegex.exec(content)) !== null) {
			endpoints.push({ method: match[1].toUpperCase(), route: match[2] });
		}
	}

	return { imports, exports, classes, endpoints };
}
