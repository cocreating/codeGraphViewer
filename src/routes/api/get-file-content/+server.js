import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		const { mode = 'local', localPath, filePath, repoUrl, githubToken } = await request.json();

		if (mode === 'local') {
			const targetDir = path.resolve(localPath || process.cwd());
			const absoluteFilePath = path.resolve(targetDir, filePath);
			
			// Security check: prevent directory traversal by validating file stays inside the target directory
			if (!absoluteFilePath.startsWith(targetDir)) {
				return json({ error: 'Access denied: Path traversal detected' }, { status: 403 });
			}

			if (!fs.existsSync(absoluteFilePath)) {
				return json({ error: `File not found: ${filePath}` }, { status: 404 });
			}

			const content = fs.readFileSync(absoluteFilePath, 'utf8');
			return json({ content });
		} else {
			// GitHub mode
			if (!repoUrl || !filePath) {
				return json({ error: 'Repository URL and file path are required' }, { status: 400 });
			}

			const cleanUrl = repoUrl.trim().replace(/\/$/, '').replace(/\.git$/, '');
			const match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
			if (!match) {
				return json({ error: 'Invalid GitHub URL' }, { status: 400 });
			}

			const owner = match[1];
			const repo = match[2];

			const headers = {
				'Accept': 'application/vnd.github.v3.raw', // Request raw contents directly from GitHub API
				'User-Agent': 'Code-Landscape-Viewer'
			};
			if (githubToken) {
				headers['Authorization'] = `token ${githubToken}`;
			}

			const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
			const res = await fetch(url, { headers });
			if (!res.ok) {
				const errorText = await res.text();
				return json({ error: `Failed to fetch file content: ${res.statusText || errorText}` }, { status: res.status });
			}

			const content = await res.text();
			return json({ content });
		}
	} catch (error) {
		console.error('Error fetching file content:', error);
		return json({ error: error.message || 'Internal Server Error' }, { status: 500 });
	}
}
