// Fix 1.13: Central config for API URLs
// Set VITE_API_BASE_URL in .env to configure the deploy base path.
const BASE = import.meta.env.VITE_API_BASE_URL ?? '.';

export const API_URL = `${BASE}/api.php`;
