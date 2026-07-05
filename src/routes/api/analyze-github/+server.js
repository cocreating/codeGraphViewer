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
			const nodes = demoNodes.map(node => ({ ...node, analysis: node.analysis ? { ...node.analysis } : undefined }));
			const edges = demoEdges.map(edge => ({ ...edge }));
			annotateGraph(nodes, edges);
			const rawItems = nodes
				.filter(node => node.type === 'file' || node.type === 'directory')
				.map(node => ({
					path: node.id,
					type: node.type === 'directory' ? 'tree' : 'blob',
					size: node.size || 0
				}));
			const intelligence = buildRepoIntelligence({
				mode: 'local',
				rootName: 'CodeGraphViewer',
				repoData: null,
				rawItems,
				prunedTree: rawItems,
				nodes,
				edges,
				manifestContents: new Map()
			});
			return json({ nodes, edges, ...intelligence, demo: true });
		}

		let rawItems = [];
		let rootName = '';
		let owner = '';
		let repo = '';
		let repoData = null;
		const manifestContents = new Map();

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

			for (const manifestPath of ['package.json', 'composer.json', 'pyproject.toml', 'requirements.txt', 'Gemfile']) {
				const fullPath = path.join(targetDir, manifestPath);
				if (fs.existsSync(fullPath)) {
					try {
						manifestContents.set(manifestPath, fs.readFileSync(fullPath, 'utf8'));
					} catch (err) {
						console.warn(`Could not read manifest ${manifestPath}:`, err.message);
					}
				}
			}
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

			owner = match[1];
			repo = match[2];
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
			
			repoData = await repoRes.json();
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

			for (const manifestPath of ['package.json', 'composer.json', 'pyproject.toml', 'requirements.txt', 'Gemfile']) {
				const manifestItem = treeData.tree.find(item => item.type === 'blob' && item.path === manifestPath);
				if (manifestItem?.sha) {
					try {
						manifestContents.set(manifestPath, await fetchFileContent(owner, repo, manifestItem.sha, headers));
					} catch (err) {
						console.warn(`Could not fetch manifest ${manifestPath}:`, err.message);
					}
				}
			}
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

		annotateGraph(nodes, edges);
		const intelligence = buildRepoIntelligence({
			mode,
			rootName,
			repoData,
			rawItems,
			prunedTree,
			nodes,
			edges,
			manifestContents
		});

		return json({ nodes, edges, ...intelligence });
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

function getSourceId(edge) {
	return typeof edge.source === 'object' ? edge.source.id : edge.source;
}

function getTargetId(edge) {
	return typeof edge.target === 'object' ? edge.target.id : edge.target;
}

function getExt(filePath) {
	const dotIndex = filePath.lastIndexOf('.');
	return dotIndex >= 0 ? filePath.slice(dotIndex).toLowerCase() : '';
}

function getLanguage(filePath) {
	const ext = getExt(filePath);
	const languageMap = {
		'.js': 'JavaScript',
		'.mjs': 'JavaScript',
		'.cjs': 'JavaScript',
		'.ts': 'TypeScript',
		'.tsx': 'TypeScript',
		'.jsx': 'JavaScript',
		'.svelte': 'Svelte',
		'.vue': 'Vue',
		'.astro': 'Astro',
		'.py': 'Python',
		'.php': 'PHP',
		'.rb': 'Ruby',
		'.css': 'CSS',
		'.scss': 'SCSS',
		'.sass': 'Sass',
		'.json': 'JSON',
		'.md': 'Markdown',
		'.html': 'HTML',
		'.yml': 'YAML',
		'.yaml': 'YAML'
	};
	return languageMap[ext] || (ext ? ext.slice(1).toUpperCase() : 'Plain text');
}

function classifyRole(filePath, nodeType) {
	if (nodeType === 'root') return 'root';
	if (nodeType === 'directory') {
		const name = filePath.split('/').pop();
		if (/^(test|tests|__tests__|spec|e2e)$/i.test(name)) return 'tests';
		if (/^(components|ui|widgets)$/i.test(name)) return 'components';
		if (/^(routes|pages|app)$/i.test(name)) return 'routing';
		if (/^(api|server|controllers)$/i.test(name)) return 'api';
		if (/^(styles|css|scss)$/i.test(name)) return 'styles';
		if (/^(docs|documentation)$/i.test(name)) return 'docs';
		if (/^(assets|static|public|images)$/i.test(name)) return 'assets';
		return 'folder';
	}

	const lower = filePath.toLowerCase();
	const name = lower.split('/').pop();

	if (/readme|changelog|contributing|license|\.md$/.test(name) || lower.startsWith('docs/')) return 'docs';
	if (/(\.test\.|\.spec\.|__tests__|\/tests?\/|\/e2e\/)/.test(lower)) return 'tests';
	if (/src\/routes|\/routes\/|\/pages\/|\/app\/.*page\./.test(lower)) return 'routing';
	if (/\/api\/|\+server\.|controller|route\.(js|ts|php|py|rb)$/.test(lower)) return 'api';
	if (/\/components\/|\/ui\/|\.svelte$|\.vue$|\.tsx$/.test(lower)) return 'components';
	if (/\.css$|\.scss$|\.sass$|tailwind\.config|postcss\.config/.test(lower)) return 'styles';
	if (/package\.json|vite\.config|svelte\.config|next\.config|astro\.config|tsconfig|jsconfig|composer\.json|pyproject\.toml|gemfile|dockerfile|vercel\.json|netlify\.toml/.test(lower)) return 'config';
	if (/\/assets\/|\/static\/|\/public\/|\.(png|jpg|jpeg|gif|webp|svg|ico)$/.test(lower)) return 'assets';
	return 'source';
}

function annotateGraph(nodes, edges) {
	const importsOut = new Map();
	const importsIn = new Map();

	edges.forEach(edge => {
		if (edge.type !== 'import') return;
		const source = getSourceId(edge);
		const target = getTargetId(edge);
		importsOut.set(source, (importsOut.get(source) || 0) + 1);
		importsIn.set(target, (importsIn.get(target) || 0) + 1);
	});

	nodes.forEach(node => {
		node.role = classifyRole(node.id, node.type);
		node.language = node.type === 'file' ? getLanguage(node.id) : null;
		node.importsCount = node.analysis?.importsCount || importsOut.get(node.id) || 0;
		node.dependentsCount = importsIn.get(node.id) || 0;
		node.depth = node.id && node.id !== 'root' ? node.id.split('/').length - 1 : 0;

		const riskReasons = [];
		let riskScore = 0;

		if (node.type === 'file') {
			if ((node.size || 0) > 20000) {
				riskScore += 30;
				riskReasons.push('large file');
			} else if ((node.size || 0) > 10000) {
				riskScore += 15;
				riskReasons.push('medium-large file');
			}

			if (node.importsCount > 8) {
				riskScore += 25;
				riskReasons.push('many dependencies');
			} else if (node.importsCount > 4) {
				riskScore += 12;
				riskReasons.push('several dependencies');
			}

			if (node.dependentsCount > 8) {
				riskScore += 30;
				riskReasons.push('many dependents');
			} else if (node.dependentsCount > 3) {
				riskScore += 15;
				riskReasons.push('shared dependency');
			}

			if (node.depth > 5) {
				riskScore += 8;
				riskReasons.push('deeply nested');
			}

			if (node.role === 'api' || node.role === 'config') {
				riskScore += 10;
				riskReasons.push(`${node.role} surface`);
			}

			if (['.js', '.ts', '.svelte', '.py', '.php', '.jsx', '.tsx', '.mjs', '.cjs'].includes(getExt(node.id)) && !node.analysis) {
				riskScore += 8;
				riskReasons.push('not parsed in current cap');
			}
		}

		node.riskScore = Math.min(100, Math.round(riskScore));
		node.riskLevel = node.riskScore >= 50 ? 'high' : node.riskScore >= 25 ? 'medium' : 'low';
		node.riskReasons = riskReasons;
		node.importanceScore = Math.round(
			(node.dependentsCount * 4) +
			(node.importsCount * 2) +
			((node.size || 0) / 2500) +
			(node.role === 'routing' || node.role === 'api' ? 6 : 0) +
			(node.role === 'config' ? 5 : 0)
		);
	});
}

function safeParsePackageJson(manifestContents) {
	const raw = manifestContents.get('package.json');
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function hasPath(paths, matcher) {
	return paths.some(path => typeof matcher === 'string' ? path === matcher : matcher.test(path));
}

function detectTechnology(paths, manifestContents) {
	const packageJson = safeParsePackageJson(manifestContents);
	const deps = {
		...(packageJson?.dependencies || {}),
		...(packageJson?.devDependencies || {})
	};
	const hasDep = (name) => Boolean(deps[name]);
	const tech = [];

	if (hasDep('@sveltejs/kit') || hasPath(paths, /svelte\.config\./)) tech.push('SvelteKit');
	else if (hasDep('svelte') || hasPath(paths, /\.svelte$/)) tech.push('Svelte');
	if (hasDep('next') || hasPath(paths, /next\.config\./)) tech.push('Next.js');
	if (hasDep('vue') || hasPath(paths, /\.vue$/)) tech.push('Vue');
	if (hasDep('astro') || hasPath(paths, /astro\.config\./)) tech.push('Astro');
	if (hasDep('express')) tech.push('Express');
	if (hasPath(paths, 'composer.json') && /laravel\/framework/.test(manifestContents.get('composer.json') || '')) tech.push('Laravel');
	if (hasPath(paths, /wp-content|functions\.php|style\.css/)) tech.push('WordPress');
	if (hasPath(paths, 'manage.py') || hasDep('django') || /django/i.test(manifestContents.get('requirements.txt') || '')) tech.push('Django');
	if (hasPath(paths, 'Gemfile') && /rails/i.test(manifestContents.get('Gemfile') || '')) tech.push('Rails');
	if (hasDep('vite') || hasPath(paths, /vite\.config\./)) tech.push('Vite');
	if (hasDep('d3')) tech.push('D3');
	if (hasDep('gsap')) tech.push('GSAP');

	return [...new Set(tech)];
}

function detectProjectType(paths, manifestContents, detectedTech) {
	const packageJson = safeParsePackageJson(manifestContents);
	const hasApi = paths.some(path => /\/api\/|\+server\.|controllers?|routes?\/api/i.test(path));
	const hasFrontend = detectedTech.some(tech => ['SvelteKit', 'Svelte', 'Next.js', 'Vue', 'Astro'].includes(tech));
	const hasDocs = paths.some(path => path.startsWith('docs/') || path.toLowerCase().endsWith('.md'));
	const hasPackages = paths.some(path => /^packages\/[^/]+\/package\.json$/.test(path)) || Boolean(packageJson?.workspaces);

	if (hasPackages) return 'monorepo';
	if (hasFrontend && hasApi) return 'full-stack app';
	if (hasFrontend) return 'frontend app';
	if (hasApi) return 'backend API';
	if (packageJson?.bin) return 'CLI tool';
	if (packageJson?.main || packageJson?.exports) return 'package/library';
	if (hasDocs) return 'documentation site';
	return 'code repository';
}

function getLanguageBreakdown(rawItems) {
	const totals = new Map();
	let totalBytes = 0;

	rawItems.forEach(item => {
		if (item.type !== 'blob') return;
		const size = item.size || 0;
		const language = getLanguage(item.path);
		totals.set(language, (totals.get(language) || 0) + size);
		totalBytes += size;
	});

	return Array.from(totals.entries())
		.map(([language, bytes]) => ({
			language,
			bytes,
			percent: totalBytes ? Math.round((bytes / totalBytes) * 1000) / 10 : 0
		}))
		.sort((a, b) => b.bytes - a.bytes)
		.slice(0, 8);
}

function getEntryPoints(paths, packageJson) {
	const candidates = [
		'README.md',
		'package.json',
		'src/routes/+page.svelte',
		'src/routes/+layout.svelte',
		'src/main.js',
		'src/main.ts',
		'src/App.svelte',
		'src/App.vue',
		'app/page.tsx',
		'pages/index.tsx',
		'pages/index.js',
		'manage.py',
		'index.php'
	];
	const entries = candidates.filter(path => paths.includes(path));
	if (packageJson?.main && paths.includes(packageJson.main)) entries.push(packageJson.main);
	if (packageJson?.module && paths.includes(packageJson.module)) entries.push(packageJson.module);
	return [...new Set(entries)].slice(0, 8);
}

function buildReadingPath(paths, nodes, entryPoints) {
	const steps = [];
	const push = (path, reason) => {
		if (!path || !paths.includes(path) || steps.some(step => step.path === path)) return;
		steps.push({ path, reason });
	};

	push('README.md', 'Start with project intent, setup notes, and usage context.');
	push('package.json', 'Understand scripts, runtime dependencies, and package shape.');
	['vite.config.js', 'svelte.config.js', 'next.config.js', 'astro.config.mjs', 'composer.json', 'pyproject.toml'].forEach(path => {
		push(path, 'Review build and framework configuration.');
	});
	entryPoints.forEach(path => push(path, 'Inspect an application or package entry point.'));

	nodes
		.filter(node => node.type === 'file' && ['routing', 'api', 'components'].includes(node.role))
		.sort((a, b) => b.importanceScore - a.importanceScore)
		.slice(0, 4)
		.forEach(node => push(node.id, `Review a core ${node.role} file with high graph importance.`));

	nodes
		.filter(node => node.type === 'file' && node.role === 'tests')
		.sort((a, b) => b.importanceScore - a.importanceScore)
		.slice(0, 2)
		.forEach(node => push(node.id, 'Check how behavior is tested.'));

	return steps.slice(0, 10);
}

function getMainFolders(nodes) {
	const folderMap = new Map();
	nodes.forEach(node => {
		if (node.type !== 'file') return;
		const folder = node.id.includes('/') ? node.id.split('/')[0] : '(root)';
		const current = folderMap.get(folder) || { folder, files: 0, bytes: 0, riskScore: 0 };
		current.files += 1;
		current.bytes += node.size || 0;
		current.riskScore += node.riskScore || 0;
		folderMap.set(folder, current);
	});

	return Array.from(folderMap.values())
		.map(folder => ({
			...folder,
			avgRisk: folder.files ? Math.round(folder.riskScore / folder.files) : 0
		}))
		.sort((a, b) => b.files - a.files)
		.slice(0, 8);
}

function buildRepoIntelligence({ mode, rootName, repoData, rawItems, prunedTree, nodes, edges, manifestContents }) {
	const paths = rawItems.map(item => item.path);
	const packageJson = safeParsePackageJson(manifestContents);
	const detectedTech = detectTechnology(paths, manifestContents);
	const projectType = detectProjectType(paths, manifestContents, detectedTech);
	const entryPoints = getEntryPoints(paths, packageJson);
	const fileNodes = nodes.filter(node => node.type === 'file');
	const directoryNodes = nodes.filter(node => node.type === 'directory');
	const highRiskFiles = fileNodes
		.filter(node => node.riskLevel === 'high' || node.riskLevel === 'medium')
		.sort((a, b) => b.riskScore - a.riskScore || b.importanceScore - a.importanceScore)
		.slice(0, 10);
	const importantFiles = fileNodes
		.sort((a, b) => b.importanceScore - a.importanceScore)
		.slice(0, 10);
	const roleCounts = nodes.reduce((acc, node) => {
		acc[node.role] = (acc[node.role] || 0) + 1;
		return acc;
	}, {});

	const analyzedFiles = fileNodes.filter(node => node.analysis).length;
	const totalFiles = rawItems.filter(item => item.type === 'blob').length;

	return {
		repo: {
			name: repoData?.name || rootName,
			fullName: repoData?.full_name || rootName,
			description: repoData?.description || '',
			url: repoData?.html_url || null,
			defaultBranch: repoData?.default_branch || null,
			stars: repoData?.stargazers_count ?? null,
			forks: repoData?.forks_count ?? null,
			openIssues: repoData?.open_issues_count ?? null,
			license: repoData?.license?.spdx_id || repoData?.license?.name || null,
			lastActivity: repoData?.pushed_at || null,
			mode
		},
		summary: {
			projectType,
			architecture: `${projectType} with ${detectedTech.length ? detectedTech.join(', ') : 'no dominant framework detected'}. The analyzed graph currently includes ${fileNodes.length} files, ${directoryNodes.length} folders, and ${edges.length} relationships.`,
			totalFiles,
			displayedFiles: fileNodes.length,
			analyzedFiles,
			totalFolders: rawItems.filter(item => item.type === 'tree').length,
			displayedFolders: directoryNodes.length,
			graphNodeCapApplied: rawItems.length > prunedTree.length,
			graphNodeCap: prunedTree.length,
			roleCounts
		},
		detectedTech,
		languageBreakdown: getLanguageBreakdown(rawItems),
		entryPoints,
		mainFolders: getMainFolders(nodes),
		importantFiles,
		highRiskFiles,
		readingPath: buildReadingPath(paths, nodes, entryPoints),
		health: {
			complexityScore: Math.min(100, Math.round(fileNodes.reduce((sum, node) => sum + (node.riskScore || 0), 0) / Math.max(1, fileNodes.length))),
			highRiskCount: highRiskFiles.filter(node => node.riskLevel === 'high').length,
			mediumRiskCount: highRiskFiles.filter(node => node.riskLevel === 'medium').length,
			importEdges: edges.filter(edge => edge.type === 'import').length,
			packageCount: nodes.filter(node => node.type === 'package').length,
			analysisCoverage: totalFiles ? Math.round((analyzedFiles / totalFiles) * 100) : 0
		}
	};
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
