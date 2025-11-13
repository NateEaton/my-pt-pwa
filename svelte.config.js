import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false
    }),
    paths: {
      // This will read the BASE_PATH environment variable,
      // falling back to an empty string if it's not set.
      base: process.env.BASE_PATH || ''
    }
  }
};