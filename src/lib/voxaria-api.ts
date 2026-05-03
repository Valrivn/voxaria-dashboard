export interface StatusResponse {
    online: boolean;
    activeShard: number;
    pingMs: number;
}

export interface GenericResponse {
    success: boolean;
    message?: string;
    error?: string;
}

// Remote API Tunnel
const API_BASE_URL = 'https://unhitched-shrink-dorsal.ngrok-free.dev';

export async function getStatus(): Promise<StatusResponse> {
    const response = await fetch(`${API_BASE_URL}/api/status`, {
        headers: {
            'ngrok-skip-browser-warning': 'true'
        }
    });
    if (!response.ok) {
        throw new Error(`Error fetching status: ${response.statusText}`);
    }
    return response.json();
}

export async function cleanAudioCache(): Promise<GenericResponse> {
    const response = await fetch(`${API_BASE_URL}/api/cache/clean`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
        }
    });
    if (!response.ok) {
        throw new Error(`Error cleaning audio cache: ${response.statusText}`);
    }
    return response.json();
}

export async function setSessionRestore(enabled: boolean): Promise<GenericResponse> {
    const response = await fetch(`${API_BASE_URL}/api/settings/session-restore`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ enabled })
    });
    if (!response.ok) {
        throw new Error(`Error setting session restore: ${response.statusText}`);
    }
    return response.json();
}
