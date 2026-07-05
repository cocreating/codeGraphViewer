import { json } from '@sveltejs/kit';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getDefaultLocalRepository } from '$lib/config/defaults.js';

const ignoredDirectoryNames = new Set([
	'.git',
	'.svelte-kit',
	'build',
	'dist',
	'node_modules',
	'vendor',
	'__pycache__'
]);

function uniquePaths(paths) {
	const seen = new Set();
	return paths
		.filter(Boolean)
		.map(item => path.resolve(item))
		.filter(item => {
			if (seen.has(item)) return false;
			seen.add(item);
			return true;
		});
}

function buildRoots() {
	const home = os.homedir();
	const cwd = process.cwd();
	const defaultRepo = getDefaultLocalRepository()?.path;
	const candidates = [
		defaultRepo,
		cwd,
		home,
		path.join(home, 'AllMyCoding'),
		path.join(home, 'Downloads'),
		path.parse(cwd).root
	];

	return uniquePaths(candidates)
		.filter(item => fs.existsSync(item))
		.map(item => ({
			name: item === home ? 'Home' : path.basename(item) || item,
			path: item
		}));
}

function listDirectories(targetPath) {
	const entries = fs.readdirSync(targetPath, { withFileTypes: true });

	return entries
		.filter(entry => entry.isDirectory() && !ignoredDirectoryNames.has(entry.name))
		.map(entry => {
			const fullPath = path.join(targetPath, entry.name);
			let readable = true;

			try {
				fs.accessSync(fullPath, fs.constants.R_OK);
			} catch {
				readable = false;
			}

			return {
				name: entry.name,
				path: fullPath,
				readable,
				hidden: entry.name.startsWith('.')
			};
		})
		.sort((a, b) => {
			if (a.hidden !== b.hidden) return a.hidden ? 1 : -1;
			return a.name.localeCompare(b.name);
		});
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
	const requestedPath = url.searchParams.get('path');
	const home = os.homedir();
	const currentPath = path.resolve(requestedPath || getDefaultLocalRepository()?.path || home);

	try {
		const stat = fs.statSync(currentPath);
		if (!stat.isDirectory()) {
			return json({ error: `Path is not a directory: ${currentPath}` }, { status: 400 });
		}

		fs.accessSync(currentPath, fs.constants.R_OK);

		return json({
			currentPath,
			parentPath: path.dirname(currentPath) === currentPath ? null : path.dirname(currentPath),
			roots: buildRoots(),
			entries: listDirectories(currentPath)
		});
	} catch (err) {
		return json(
			{
				error: err.message || `Cannot read directory: ${currentPath}`,
				currentPath,
				parentPath: path.dirname(currentPath) === currentPath ? null : path.dirname(currentPath),
				roots: buildRoots(),
				entries: []
			},
			{ status: 400 }
		);
	}
}
