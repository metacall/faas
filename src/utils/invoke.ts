import crypto from 'crypto';

interface Invocation {
	resolve: (value: string) => void;
	reject: (reason: string) => void;
	suffix: string;
}

class InvokeQueue {
	private queue: Record<string, Invocation> = {};

	public push(invoke: Invocation): string {
		const id = crypto.randomBytes(16).toString('hex');
		this.queue[id] = invoke;
		return id;
	}

	public get(id: string): Invocation | undefined {
		const invoke = this.queue[id];
		delete this.queue[id];
		return invoke;
	}

	public rejectBySuffix(suffix: string, reason: string): void {
		Object.entries(this.queue).forEach(([id, invoke]) => {
			if (invoke.suffix === suffix) {
				invoke.reject(reason);
				delete this.queue[id];
			}
		});
	}
}

export const invokeQueue = new InvokeQueue();
