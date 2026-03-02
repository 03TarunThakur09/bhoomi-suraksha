const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface User {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    subscription_tier: string;
    created_at: string;
}

export interface Document {
    id: string;
    filename: string;
    original_filename: string;
    file_size: number;
    mime_type: string;
    document_type: string | null;
    status: string;
    created_at: string;
}

export interface AnalyzeResponse {
    document_id: string;
    document_type: string | null;
    entities: Record<string, any>;
    confidence: number;
}

export interface EntitiesResponse {
    document_id: string;
    document_type: string | null;
    entities: Record<string, any>;
    confidence: number;
}

export interface NarrationResponse {
    document_id: string;
    narration: string;
}

class ApiClient {
    private getToken(): string | null {
        if (typeof window === "undefined") return null;
        return localStorage.getItem("propverify_token");
    }

    private headers(isJson = true): HeadersInit {
        const headers: HeadersInit = {};
        const token = this.getToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
        if (isJson) headers["Content-Type"] = "application/json";
        return headers;
    }

    private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        const res = await fetch(`${API_BASE}${path}`, options);
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: "Request failed" }));
            throw new Error(error.detail || `HTTP ${res.status}`);
        }
        if (res.status === 204) return {} as T;
        return res.json();
    }

    // Auth
    async register(email: string, password: string, full_name: string) {
        return this.request<User>("/api/auth/register", {
            method: "POST",
            headers: this.headers(),
            body: JSON.stringify({ email, password, full_name }),
        });
    }

    async login(email: string, password: string) {
        const data = await this.request<{ access_token: string }>("/api/auth/login", {
            method: "POST",
            headers: this.headers(),
            body: JSON.stringify({ email, password }),
        });
        localStorage.setItem("propverify_token", data.access_token);
        return data;
    }

    async getMe() {
        return this.request<User>("/api/auth/me", { headers: this.headers() });
    }

    logout() {
        localStorage.removeItem("propverify_token");
    }

    // Documents
    async uploadDocument(file: File) {
        const formData = new FormData();
        formData.append("file", file);
        return this.request<Document>("/api/documents/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${this.getToken()}` },
            body: formData,
        });
    }

    async listDocuments() {
        return this.request<{ documents: Document[]; total: number }>("/api/documents/", {
            headers: this.headers(),
        });
    }

    async getDocument(id: string) {
        return this.request<Document>(`/api/documents/${id}`, {
            headers: this.headers(),
        });
    }

    async deleteDocument(id: string) {
        return this.request<void>(`/api/documents/${id}`, {
            method: "DELETE",
            headers: this.headers(),
        });
    }

    // Analyze — runs OCR + entity extraction
    async analyzeDocument(documentId: string) {
        return this.request<AnalyzeResponse>(`/api/documents/${documentId}/analyze`, {
            method: "POST",
            headers: this.headers(),
        });
    }

    // Get saved entities
    async getEntities(documentId: string) {
        return this.request<EntitiesResponse>(`/api/documents/${documentId}/entities`, {
            headers: this.headers(),
        });
    }

    // Generate AI narration text
    async getNarration(documentId: string) {
        return this.request<NarrationResponse>(`/api/documents/${documentId}/narrate`, {
            method: "POST",
            headers: this.headers(),
        });
    }

    // Generate AI speech audio (Gemini 2.5 Flash TTS) — returns audio blob URL
    async getTTS(documentId: string, voice: string = "Kore"): Promise<string> {
        const token = this.getToken();
        const res = await fetch(
            `${API_BASE}/api/documents/${documentId}/tts?voice=${encodeURIComponent(voice)}`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: "TTS failed" }));
            throw new Error(error.detail || `HTTP ${res.status}`);
        }
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    }

    isAuthenticated(): boolean {
        return !!this.getToken();
    }
}

export const api = new ApiClient();
