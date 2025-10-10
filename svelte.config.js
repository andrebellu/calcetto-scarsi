import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			images: {
				sizes: [16, 32, 48, 64, 96, 128, 256, 384, 512, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
			},
			formats: ['image/avif', 'image/webp'],
			minimumCacheTTL: 300,
							domains: ['calcetto-scarsi.vercel.app'],
		})

	}
};

export default config;