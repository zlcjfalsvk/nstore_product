import { Sleep } from '../../src/util';

describe('UtilTest', () => {
	describe('Sleep', () => {
		it('정상 작동 ', async () => {
			const ms = 10;
			const start = Date.now();
			const promise = Sleep(ms);
			await promise;
			const end = Date.now();
			expect(end - start).toBeGreaterThanOrEqual(ms);
			expect(end - start).toBeLessThanOrEqual(ms + 5);
		});
	});
});
