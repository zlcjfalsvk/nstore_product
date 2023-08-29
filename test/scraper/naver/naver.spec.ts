import { Naver } from '../../../src/scraper';
import * as fs from 'fs';

describe('', () => {
	const NAVER_SMART_STORE_DEFAULT_URL = 'https://smartstore.naver.com';
	const name = 'jaytenstore';
	const marketInfoJsonData = JSON.parse(
		fs.readFileSync(`test/scraper/naver/dummy/marketInfo.json`).toString(),
	);

	const productsJsonData = JSON.parse(
		fs.readFileSync(`test/scraper/naver/dummy/products.json`).toString(),
	);
	describe('Start', () => {
		it('channelName', async () => {
			const getMarketInfoSpy = jest.spyOn(
				Naver.prototype as any,
				'getMarketInfo',
			);
			getMarketInfoSpy.mockImplementation(() => marketInfoJsonData);

			const getProductPageSpy = jest.spyOn(
				Naver.prototype as any,
				'getProductPage',
			);
			getProductPageSpy.mockImplementation(() => productsJsonData);

			const naver = new Naver(NAVER_SMART_STORE_DEFAULT_URL, name);
			const channelName = await naver.Start();
			expect(channelName).toBe(marketInfoJsonData.channel.channelName);
			expect(getMarketInfoSpy).toBeCalled();
			expect(getProductPageSpy).toBeCalled();
		});
	});
});
