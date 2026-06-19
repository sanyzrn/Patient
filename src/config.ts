// Fix 1.13: Central config for API URLs
// Set VITE_API_BASE_URL in .env to configure the deploy base path.
const BASE = import.meta.env.VITE_API_BASE_URL ?? '.';

export const API_URL = `${BASE}/api.php`;
export const CHAT_URL = `${BASE}/chat.php`;
export const SUBMIT_FORM_URL = `${BASE}/submit_form.php`;
