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
	],

	/**
	 * Flow Particles — the glowing dots ("electrons") that travel along graph edges.
	 * Tweak these values to change size, colour, glow intensity, and speed without
	 * touching the renderer code in GraphCanvas.svelte.
	 */
	flowParticles: {
		// Radius in canvas pixels (before 3D perspective scaling)
		importRadius: 1.4,       // import-edge particles (main type)
		otherRadius: 0.9,        // hierarchy / contains particles

		// Fill colour as [r, g, b] — rendered as rgba(r,g,b,opacity)
		importColor: [253, 224, 71],   // warm amber-yellow (#fde047)
		otherColor:  [255, 255, 255],  // white for hierarchy/contains

		// Shadow glow colour (CSS colour string)
		importGlowColor: '#fbbf24',    // amber (#fbbf24)
		otherGlowColor:  '#ffffff',

		// Shadow blur radius (px) — higher = softer wider glow
		importGlowBlur:       6,       // ambient
		importGlowBlurActive: 12,      // when edge is highlighted/selected
		otherGlowBlur:        3,

		// Fill opacity (0–1). Active multiplier is applied on top when edge highlighted.
		importOpacity:       0.85,
		otherOpacity:        0.45,

		// Travel speed (edge-length cycles per second)
		importSpeed: 0.38,
		otherSpeed:  0.22,

		// Speed multiplier applied when the parent edge is selected/highlighted
		activeSpeedMultiplier: 1.6
	}
};

export const getDefaultLocalRepository = () => {
	return DEFAULT_APP_CONFIG.localRepositories.find(repo => repo.isDefault) || DEFAULT_APP_CONFIG.localRepositories[0];
};
