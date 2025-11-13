// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}

	// Build identification constants injected by Vite
	const __BUILD_ID__: string;
	const __BUILD_TIME__: string;
	const __GIT_BRANCH__: string | null;
	const __APP_VERSION__: string;
	const __NODE_VERSION__: string;
	const __BUILD_PLATFORM__: string;
}

interface ImportMetaEnv {
	readonly VITE_WORKER_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

export {};