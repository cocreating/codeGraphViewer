export const DEFAULT_APP_CONFIG = {
	defaultMode: 'local',
	defaultFocusMode: 'related',
	localRepositories: [
		{
			id: 'example',
			label: 'CodeGraphViewer example',
			path: '/Users/jasubal/AllMyCoding/CodeGraphViewer',
			isDefault: true
		},
		{
			id: 'custom',
			label: 'Custom local path',
			path: ''
		}
	]
};

export const getDefaultLocalRepository = () => {
	return DEFAULT_APP_CONFIG.localRepositories.find(repo => repo.isDefault) || DEFAULT_APP_CONFIG.localRepositories[0];
};
