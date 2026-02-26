import axios from 'axios';
import type { Deployment, Plans } from '@/types';

const BASE_URL = (import.meta.env.VITE_FAAS_URL as string | undefined) ?? 'http://localhost:9000';
const TOKEN = (import.meta.env.VITE_FAAS_TOKEN as string | undefined) ?? 'local';

const http = axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${TOKEN}` },
});

export interface EnvVar {
    name: string;
    value: string;
}

export type ResourceType = 'Package' | 'Repository';

export const api = {
    ready: async (): Promise<boolean> => {
        try {
            const res = await http.get<unknown>('/api/readiness');
            return res.status === 200;
        } catch {
            return false;
        }
    },

    inspect: async (): Promise<Deployment[]> => {
        const res = await http.get<Deployment[]>('/api/inspect');
        return res.data;
    },

    inspectByName: async (suffix: string): Promise<Deployment> => {
        const all = await api.inspect();
        const found = all.find(d => d.suffix === suffix);
        if (!found) throw new Error(`Deployment "${suffix}" not found`);
        return found;
    },

    upload: async (name: string, file: File): Promise<string> => {
        const form = new FormData();
        form.append('id', name);
        form.append('blob', file);
        const res = await http.post<string>('/api/package/create', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    },

    deploy: async (
        name: string,
        env: EnvVar[],
        plan: Plans,
        resourceType: ResourceType,
    ): Promise<{ suffix: string; prefix: string; version: string }> => {
        const res = await http.post<{ suffix: string; prefix: string; version: string }>('/api/deploy/create', {
            suffix: name,
            resourceType,
            release: name,
            env,
            plan,
            version: 'v1',
        });
        return res.data;
    },

    deployDelete: async (prefix: string, suffix: string, version: string): Promise<void> => {
        await http.post('/api/deploy/delete', { prefix, suffix, version });
    },

    logs: async (suffix: string, prefix: string, type: 'deploy' | 'job' = 'deploy'): Promise<string> => {
        const res = await http.post<string>('/api/deploy/logs', { suffix, prefix, type });
        return res.data;
    },

    call: async <R>(prefix: string, suffix: string, version: string, name: string, args: unknown[] = []): Promise<R> => {
        const res = await http.post<R>(`/${prefix}/${suffix}/${version}/call/${name}`, args);
        return res.data;
    },

    branchList: async (url: string): Promise<string[]> => {
        const res = await http.post<{ branches: string[] }>('/api/repository/branchlist', { url });
        return res.data.branches;
    },

    add: async (url: string, branch: string): Promise<{ id: string }> => {
        const res = await http.post<{ id: string }>('/api/repository/add', { url, branch, jsons: [] });
        return res.data;
    },
};
