import crypto from 'crypto';

interface Invocation {
	resolve: (value: string) => void;
	reject: (reason: string) => void;
}

class InvokeQueue {
	private queue: Record<string, Invocation> = {};

	public push(invoke: Invocation): string {
		const id = crypto.randomBytes(16).toString('hex');
		this.queue[id] = invoke;
		return id;
	}

	public get(id: string): Invocation {
		const invoke = this.queue[id];
		delete this.queue[id];
		return invoke;
	}

	public has(id: string): boolean {
		return id in this.queue;
	}

	public drain(reason: string): void {
		for (const [id, invoke] of Object.entries(this.queue)) {
			invoke.reject(reason);
			delete this.queue[id];
		}
	}
}

export const invokeQueue = new InvokeQueue();
