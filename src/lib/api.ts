// Get the API URL from environment variables, defaulting to /api for local development with proxy
// Trimming trailing slashes to ensure consistent path joining
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

console.log('🌐 API Connection Initialized:', API_BASE_URL);

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const response = await fetch(`${API_BASE_URL}${cleanEndpoint}`, options);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API Error: ${response.statusText}`);
    }
    return response.json();
}
