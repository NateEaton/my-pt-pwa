import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { execSync } from "child_process";

/**
 * Generates a unique build identifier combining git hash and timestamp
 * @returns {string} Build ID in format: "a1b2c3d-20240817143022" or "20240817143022" if no git
 */
function createBuildId() {
  // Create timestamp in format YYYYMMDDHHMMSS
  const timestamp = new Date().toISOString().replace(/[-T:.]/g, '').slice(0, 14);
  
  try {
    // Try to get git commit hash (short version)
    const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    
    // Check if working directory has uncommitted changes
    const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    const isDirty = status.length > 0;
    
    return `${gitHash}${isDirty ? '-dirty' : ''}-${timestamp}`;
  } catch (error) {
    // Fallback if not in git repo or git not available
    console.warn('Git not available, using timestamp-only build ID');
    return timestamp;
  }
}

/**
 * Gets git branch name if available
 * @returns {string|null} Current git branch or null if not available
 */
function getGitBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  } catch (error) {
    return null;
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const base_path =
    env.BASE_PATH && env.BASE_PATH !== "/" ? `${env.BASE_PATH}/` : "/";

  return {
    plugins: [
      sveltekit(),
      VitePWA({
        registerType: "prompt",
        workbox: {
          cleanupOutdatedCaches: true,
          globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
          runtimeCaching: [
            // HTML navigation: must be network-first
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "navigation",
                networkTimeoutSeconds: 3,
              }
            },
          
            // Hashed build assets: safe to cache with SWR
            {
              urlPattern: /\.(js|css|woff2?|png|jpg|svg|ico)$/,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "assets",
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 30
                }
              }
            }
          ]
        },
        includeAssets: ["favicon.ico", "index.html"],
        manifest: {
          name: "My PT",
          short_name: "MyPT",
          description: "A simple, privacy-focused app to help you track your physical therapy exercises.",
          theme_color: "#1976d2",
          background_color: "#ffffff",
          display: "standalone",
          scope: base_path,
          start_url: base_path,
          icons: [
            {
              src: "pwa-icon.svg",
              sizes: "any",
              type: "image/svg+xml",
            },
            {
              src: "maskable-icon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "maskable",
            },
          ],
        },
      }),
    ],
    define: {
      __BUILD_ID__: JSON.stringify(createBuildId()),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __GIT_BRANCH__: JSON.stringify(getGitBranch()),
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __NODE_VERSION__: JSON.stringify(process.version),
      __BUILD_PLATFORM__: JSON.stringify(process.platform)
    },
    base: base_path === "/" ? "" : base_path.slice(0, -1),
    server: {
      fs: {
        allow: [".."],
      },
    },
  };
});