import { Naver } from '../../../src/scraper';
import * as fs from 'fs';

describe('', () => {
	const NAVER_SMART_STORE_DEFAULT_URL = 'https://smartstore.naver.com';
	const name = 'jaytenstore';
	const naver = new Naver(NAVER_SMART_STORE_DEFAULT_URL, name);
	const jsonData = JSON.parse(
		fs.readFileSync(`test/scraper/naver/dummy/marketInfo.json`).toString(),
	);
	describe('Start', () => {
		it('channelName', async () => {
			jest.spyOn(naver, 'Start').mockResolvedValue(
				jsonData.channel.channelName,
			);
			const channelName = await naver.Start();
			expect(channelName).toBe(jsonData.channel.channelName);
		});
	});
});
