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

export interface CurrentSongResponse {
    title: string;
    artist: string;
    currentTime?: number;
    startTime?: number; // Timestamp when song started (Date.now())
    isPlaying?: boolean;
}

export interface LyricLine {
    time: number;
    text: string;
}

export type LyricsResponse = LyricLine[];

// Remote API Tunnel
const API_BASE_URL = 'https://unhitched-shrink-dorsal.ngrok-free.dev';

export async function getStatus(): Promise<StatusResponse> {
    const response = await fetch(`${API_BASE_URL}/status`, {
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
    const response = await fetch(`${API_BASE_URL}/cache/clean`, {
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
    const response = await fetch(`${API_BASE_URL}/settings/session-restore`, {
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

export async function summonBot(): Promise<GenericResponse> {
    const response = await fetch(`${API_BASE_URL}/discord/join`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
        }
    });
    if (!response.ok) {
        throw new Error(`Error summoning bot: ${response.statusText}`);
    }
    return response.json();
}

export async function getCurrentSong(): Promise<CurrentSongResponse> {
    const response = await fetch(`${API_BASE_URL}/music/current`, {
        headers: {
            'ngrok-skip-browser-warning': 'true'
        }
    });
    if (!response.ok) {
        throw new Error(`Error fetching current song: ${response.statusText}`);
    }
    return response.json();
}

export async function getLyrics(title: string, artist: string): Promise<LyricsResponse> {
    const response = await fetch(`${API_BASE_URL}/music/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`, {
        headers: {
            'ngrok-skip-browser-warning': 'true'
        }
    });
    if (!response.ok) {
        throw new Error(`Error fetching lyrics: ${response.statusText}`);
    }
    return response.json();
}
