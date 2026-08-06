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
	public rejectAll(reason: string): void {
		for (const id of Object.keys(this.queue)) {
			this.queue[id].reject(reason);
			delete this.queue[id];
		}
	}
}

export const invokeQueue = new InvokeQueue();
