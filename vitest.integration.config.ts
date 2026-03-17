import { defineConfig } from 'vitest/config';
import { BaseSequencer } from 'vitest/node';
import type { TestSpecification } from 'vitest/node';

class OrderedSequencer extends BaseSequencer {
	async sort(files: TestSpecification[]) {
		const order = [
			'package-deploy.test.ts',
			'repository-deploy.test.ts',
			'concurrent.test.ts',
			'lifecycle.test.ts'
		];

		const getPriority = (moduleId: string) => {
			const name = moduleId.split('/').pop() || '';
			const index = order.indexOf(name);
			return index === -1 ? order.length : index;
		};

		return [...files].sort((a, b) => {
			const diff = getPriority(a.moduleId) - getPriority(b.moduleId);
			return diff !== 0 ? diff : a.moduleId.localeCompare(b.moduleId);
		});
	}
}

export default defineConfig({
	test: {
		globals: true,
		include: ['test/integration/**/*.test.ts'],
		testTimeout: 120_000,
		hookTimeout: 120_000,
		fileParallelism: false,
		sequence: {
			sequencer: OrderedSequencer,
			concurrent: false
		}
	}
});
