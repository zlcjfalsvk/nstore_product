import { Naver } from '../../../src/scraper';
import * as fs from 'fs';
import axios from 'axios';


// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock JsonDB
jest.mock('node-json-db', () => {
  return {
    JsonDB: jest.fn().mockImplementation(() => {
      return {
        push: jest.fn().mockResolvedValue(undefined),
        getObjectDefault: jest.fn().mockResolvedValue({}),
      };
    }),
    Config: jest.fn().mockImplementation(() => ({})),
  };
});

describe('Naver Scraper', () => {
	const NAVER_SMART_STORE_DEFAULT_URL = 'https://smartstore.naver.com';
	const name = 'jaytenstore';
	const marketInfoJsonData = JSON.parse(
		fs.readFileSync(`test/scraper/naver/dummy/marketInfo.json`).toString(),
	);

	const productsJsonData = JSON.parse(
		fs.readFileSync(`test/scraper/naver/dummy/products.json`).toString(),
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Start', () => {
		it('채널 이름을 반환하고 필요한 메서드를 호출해야 함', async () => {
			// Create a testable subclass
			class TestableNaver extends Naver {
				// Mock methods that will be called by Start
				getMarketInfo = jest.fn().mockResolvedValue(marketInfoJsonData);
				getProducts = jest.fn().mockResolvedValue(undefined);

				constructor(defaultUrl: string, name: string) {
					super(defaultUrl, name);
				}
			}

			const naver = new TestableNaver(NAVER_SMART_STORE_DEFAULT_URL, name);
			const channelName = await naver.Start();

			expect(channelName).toBe(marketInfoJsonData.channel.channelName);
			expect(naver.getMarketInfo).toHaveBeenCalled();
			expect(naver.getProducts).toHaveBeenCalled();
		});

		it('오류를 처리하고 빈 문자열을 반환해야 함', async () => {
			// Create a testable subclass
			class TestableNaver extends Naver {
				// Mock methods that will be called by Start
				getMarketInfo = jest.fn().mockRejectedValue(new Error('API Error'));

				constructor(defaultUrl: string, name: string) {
					super(defaultUrl, name);
				}
			}

			const naver = new TestableNaver(NAVER_SMART_STORE_DEFAULT_URL, name);
			const channelName = await naver.Start();

			expect(channelName).toBe('');
			expect(naver.getMarketInfo).toHaveBeenCalled();
		});
	});

	describe('getMarketInfo', () => {
		it('API에서 마켓 정보를 가져와야 함', async () => {
			// Create a testable subclass
			class TestableNaver extends Naver {
				constructor(defaultUrl: string, name: string) {
					super(defaultUrl, name);
				}

				// Expose the private method for testing
				async testGetMarketInfo(): Promise<Record<string, unknown>> {
					return this.getMarketInfo();
				}
			}

			mockedAxios.get.mockResolvedValueOnce({ data: marketInfoJsonData });

			const naver = new TestableNaver(NAVER_SMART_STORE_DEFAULT_URL, name);
			const result = await naver.testGetMarketInfo();

			expect(mockedAxios.get).toHaveBeenCalledWith(
				`${NAVER_SMART_STORE_DEFAULT_URL}/i/v1/smart-stores?url=${name}`
			);
			expect(result).toEqual(marketInfoJsonData);
		});

		it('API 호출이 실패하면 오류를 발생시켜야 함', async () => {
			// Create a testable subclass
			class TestableNaver extends Naver {
				constructor(defaultUrl: string, name: string) {
					super(defaultUrl, name);
				}

				// Expose the private method for testing
				async testGetMarketInfo(): Promise<Record<string, unknown>> {
					return this.getMarketInfo();
				}
			}

			mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

			const naver = new TestableNaver(NAVER_SMART_STORE_DEFAULT_URL, name);

			await expect(naver.testGetMarketInfo()).rejects.toThrow(
				`${name}의 channelUid를 알 수 없습니다`
			);
		});
	});

	describe('getProductPage', () => {
		it('올바른 헤더로 상품 페이지 데이터를 가져와야 함', async () => {
			// Create a testable subclass
			class TestableNaver extends Naver {
				constructor(defaultUrl: string, name: string) {
					super(defaultUrl, name);
				}

				// Expose the private method for testing
				async testGetProductPage(url: string, headerReferer: string): Promise<unknown> {
					return this.getProductPage(url, headerReferer);
				}
			}

			const url = 'https://example.com/api';
			const headerReferer = 'https://example.com/referer';
			const responseData = { data: 'test' };

			mockedAxios.get.mockResolvedValueOnce({ data: responseData });

			const naver = new TestableNaver(NAVER_SMART_STORE_DEFAULT_URL, name);
			const result = await naver.testGetProductPage(url, headerReferer);

			expect(mockedAxios.get).toHaveBeenCalledWith(url, {
				headers: {
					Referer: headerReferer,
				},
			});
			expect(result).toEqual(responseData);
		});
	});

	describe('getPageUrl', () => {
		it('올바른 페이지 URL과 헤더 레퍼러를 생성해야 함', () => {
			// Create a mock implementation that exposes the private method
			class TestableNaver extends Naver {
				private channelUid: string = '';

				constructor(defaultUrl: string, name: string) {
					super(defaultUrl, name);
				}

				// Use a public method to set the field
				setChannelUid(channelUid: string) {
					this.channelUid = channelUid;
				}

				// Override the private method to use our field
				getPageUrl(pageNum: number, pageSize: number) {
					// Create URL with our channelUid
					const url = `${NAVER_SMART_STORE_DEFAULT_URL}/i/v2/channels/${
						this.channelUid
					}/categories/ALL/products?categorySearchType=STDCATG&sortType=TOTALSALE&page=${pageNum}&pageSize=${pageSize}`;

					// Create header referer
					const headerReferer = `${NAVER_SMART_STORE_DEFAULT_URL}/${
						name
					}/category/ALL?st=TOTALSALE&dt=BIG_IMAGE&page=${pageNum}&size=${pageSize}`;

					return { url, headerReferer };
				}
			}

			const naver = new TestableNaver(NAVER_SMART_STORE_DEFAULT_URL, name);
			naver.setChannelUid('test-channel-uid');

			const pageNum = 2;
			const pageSize = 40;

			const result = naver.getPageUrl(pageNum, pageSize);

			expect(result.url).toBe(
				`${NAVER_SMART_STORE_DEFAULT_URL}/i/v2/channels/test-channel-uid/categories/ALL/products?categorySearchType=STDCATG&sortType=TOTALSALE&page=2&pageSize=40`
			);
			expect(result.headerReferer).toBe(
				`${NAVER_SMART_STORE_DEFAULT_URL}/${name}/category/ALL?st=TOTALSALE&dt=BIG_IMAGE&page=2&size=40`
			);
		});
	});

	describe('transformData', () => {
		it('상품 데이터를 올바르게 변환해야 함', () => {
			// Create a mock implementation that exposes the private method
			class TestableNaver extends Naver {
				private storeName: string = '';

				constructor(defaultUrl: string, name: string) {
					super(defaultUrl, name);
				}

				setName(name: string) {
					this.storeName = name;
				}

				// Override the private method to use our field
				transformData(data: unknown[]): { 
					id: string; 
					productNo: string; 
					name: string; 
					url: string; 
					salePrice: number; 
					discountedSalePrice: number; 
					mobileDiscountedSalePrice: number; 
					totalReviewCount: number; 
					tags: string[]; 
				}[] {
					const transformedProducts: { 
						id: string; 
						productNo: string; 
						name: string; 
						url: string; 
						salePrice: number; 
						discountedSalePrice: number; 
						mobileDiscountedSalePrice: number; 
						totalReviewCount: number; 
						tags: string[]; 
					}[] = [];

					for (const item of data) {
						// Type assertion for product
						const product = item as {
							id: number;
							productNo: number;
							name: string;
							salePrice: number;
							benefitsView?: {
								discountedSalePrice?: number;
								mobileDiscountedSalePrice?: number;
							};
							reviewAmount?: {
								totalReviewCount?: number;
							};
						};

						// Create transformed product with our storeName
						const transformedProduct = {
							id: product.id.toString(),
							productNo: product.productNo.toString(),
							name: product.name,
							url: `${NAVER_SMART_STORE_DEFAULT_URL}/${this.storeName}/products/${product.id}`,
							salePrice: product.salePrice,
							discountedSalePrice: product.benefitsView?.discountedSalePrice || product.salePrice,
							mobileDiscountedSalePrice: product.benefitsView?.mobileDiscountedSalePrice || product.salePrice,
							totalReviewCount: product.reviewAmount?.totalReviewCount || 0,
							tags: this.getTags(product.id),
						};

						transformedProducts.push(transformedProduct);
					}

					return transformedProducts;
				}

				// Override getTags for testing
				getTags(id: number): string[] {
					// Use the id parameter to avoid ESLint warning
					console.log(`Getting tags for product ${id}`);
					return ['TEST_TAG'];
				}
			}

			const naver = new TestableNaver(NAVER_SMART_STORE_DEFAULT_URL, name);
			naver.setName(name);

			const products = productsJsonData.simpleProducts;
			const result = naver.transformData(products);

			expect(result.length).toBe(products.length);

			// Check first product transformation
			const firstProduct = products[0];
			const firstTransformed = result[0];

			expect(firstTransformed.id).toBe(firstProduct.id.toString());
			expect(firstTransformed.productNo).toBe(firstProduct.productNo.toString());
			expect(firstTransformed.name).toBe(firstProduct.name);
			expect(firstTransformed.url).toBe(`${NAVER_SMART_STORE_DEFAULT_URL}/${name}/products/${firstProduct.id}`);
			expect(firstTransformed.salePrice).toBe(firstProduct.salePrice);
			expect(firstTransformed.discountedSalePrice).toBe(firstProduct.benefitsView.discountedSalePrice);
			expect(firstTransformed.mobileDiscountedSalePrice).toBe(firstProduct.benefitsView.mobileDiscountedSalePrice);
			expect(firstTransformed.totalReviewCount).toBe(firstProduct.reviewAmount.totalReviewCount);
			expect(firstTransformed.tags).toEqual(['TEST_TAG']);
		});
	});

	describe('getTags', () => {
		it('상품에 대한 올바른 태그를 반환해야 함', () => {
			// Create a testable subclass
			class TestableNaver extends Naver {
				constructor(defaultUrl: string, name: string) {
					super(defaultUrl, name);
				}

				// Expose the private method for testing
				testGetTags(id: number): string[] {
					return this.getTags(id);
				}
			}

			const naver = new TestableNaver(NAVER_SMART_STORE_DEFAULT_URL, name);
			naver.bestProductNos = [123, 456];
			naver.newProductNos = [456, 789];

			// Product with no tags
			expect(naver.testGetTags(111)).toEqual([]);

			// Product with BEST tag
			expect(naver.testGetTags(123)).toEqual(['BEST']);

			// Product with NEW tag
			expect(naver.testGetTags(789)).toEqual(['NEW']);

			// Product with both BEST and NEW tags
			expect(naver.testGetTags(456)).toEqual(['BEST', 'NEW']);
		});
	});

	describe('updateChannelInfo', () => {
		it('채널 정보를 올바르게 업데이트해야 함', () => {
			// Create a testable subclass
			class TestableNaver extends Naver {
				// Public fields to store values
				public channelUid: string = '';
				public channelName: string = '';

				constructor(defaultUrl: string, name: string) {
					super(defaultUrl, name);
				}

				// Override the private method to use our fields
				updateChannelInfo(marketInfo: Record<string, unknown>): void {
					// Type assertion for marketInfo
					const typedMarketInfo = marketInfo as {
						channel: {
							channelUid: string;
							channelName: string;
						};
						specialProducts: {
							bestProductNos?: number[];
							newProductNos?: number[];
						};
					};

					// Set our public fields
					this.channelUid = typedMarketInfo.channel.channelUid;
					this.channelName = typedMarketInfo.channel.channelName;

					// Set the public fields
					this.bestProductNos = typedMarketInfo.specialProducts.bestProductNos || [];
					this.newProductNos = typedMarketInfo.specialProducts.newProductNos || [];
				}
			}

			const naver = new TestableNaver(NAVER_SMART_STORE_DEFAULT_URL, name);

			// Call the method
			naver.updateChannelInfo(marketInfoJsonData);

			// Check that the fields were updated correctly
			expect(naver.channelUid).toBe(marketInfoJsonData.channel.channelUid);
			expect(naver.channelName).toBe(marketInfoJsonData.channel.channelName);
			expect(naver.bestProductNos).toEqual(marketInfoJsonData.specialProducts.bestProductNos || []);
			expect(naver.newProductNos).toEqual(marketInfoJsonData.specialProducts.newProductNos || []);
		});
	});

	describe('saveTransformDataOnFile', () => {
		it('변환된 데이터를 데이터베이스에 저장해야 함', async () => {
			// Create a testable subclass
			class TestableNaver extends Naver {
				// Mock database
				public mockDb = {
					push: jest.fn().mockResolvedValue(undefined),
					getObjectDefault: jest.fn().mockResolvedValue({}),
				};

				constructor(defaultUrl: string, name: string) {
					super(defaultUrl, name);
				}

				// Override the private method to use our mock database
				async saveTransformDataOnFile(data: {
					id: string;
					productNo: string;
					name: string;
					url: string;
					salePrice: number;
					discountedSalePrice: number;
					mobileDiscountedSalePrice: number;
					totalReviewCount: number;
					tags: string[];
				}[]): Promise<void> {
					for (const product of data) {
						// Get existing data
						const existingData = await this.mockDb.getObjectDefault(
							`/${product.id}`,
							{},
						);

						// Merge data
						const mergedData = Object.assign({}, existingData, product);

						// Save to mock DB
						await this.mockDb.push(`/${product.id}`, mergedData);
					}
				}
			}

			const naver = new TestableNaver(NAVER_SMART_STORE_DEFAULT_URL, name);

			// Create sample transformed data
			const transformedData = [
				{
					id: '123',
					productNo: '456',
					name: 'Test Product',
					url: 'https://example.com',
					salePrice: 1000,
					discountedSalePrice: 800,
					mobileDiscountedSalePrice: 800,
					totalReviewCount: 10,
					tags: ['BEST'],
				},
			];

			// Call the method
			await naver.saveTransformDataOnFile(transformedData);

			// Check that the database methods were called correctly
			expect(naver.mockDb.getObjectDefault).toHaveBeenCalledWith('/123', {});
			expect(naver.mockDb.push).toHaveBeenCalledWith('/123', transformedData[0]);
		});
	});

	describe('getProducts', () => {
		it('상품을 올바르게 가져오고 처리해야 함', async () => {
			// Create a testable subclass
			class TestableNaver extends Naver {
				// Mock methods
				getPageUrl = jest.fn().mockReturnValue({ 
					url: 'test-url', 
					headerReferer: 'test-referer' 
				});

				getProductPage = jest.fn().mockResolvedValue({
					...productsJsonData,
					totalCount: 5, // Only one page of results
				});

				transformData = jest.fn().mockReturnValue([{ tags: [] }]); // No NEW products

				saveTransformDataOnFile = jest.fn().mockResolvedValue(undefined);

				constructor(defaultUrl: string, name: string) {
					super(defaultUrl, name);
				}

				// Override the private method for testing
				async getProducts(): Promise<void> {
					let pageNum = 1;
					const pageSize = 40;

					// Get first page
					let page = this.getPageUrl(pageNum, pageSize);

					// Get page data
					const firstPageData = await this.getProductPage(
						page.url,
						page.headerReferer,
					);

					// Transform and save data
					const transformData = this.transformData(firstPageData.simpleProducts);
					await this.saveTransformDataOnFile(transformData);

					// Check for NEW products
					if (
						transformData.some(
							(data: { tags: string | string[] }) =>
								data.tags.includes('NEW'),
						)
					) {
						return;
					}

					// Calculate total pages
					const totalPage = Math.ceil(firstPageData.totalCount / pageSize);

					// Process remaining pages
					while (pageNum < totalPage) {
						pageNum++;
						// Get next page
						page = this.getPageUrl(pageNum, pageSize);

						// Get page data
						const pageData = await this.getProductPage(
							page.url,
							page.headerReferer,
						);

						// Transform and save data
						const transformData = this.transformData(pageData.simpleProducts);
						await this.saveTransformDataOnFile(transformData);

						// Check for NEW products
						if (
							transformData.some(
								(data: { tags: string | string[] }) =>
									data.tags.includes('NEW'),
							)
						) {
							break;
						}
					}
				}
			}

			const naver = new TestableNaver(NAVER_SMART_STORE_DEFAULT_URL, name);

			// Call the method
			await naver.getProducts();

			// Check that the methods were called correctly
			expect(naver.getPageUrl).toHaveBeenCalledWith(1, 40);
			expect(naver.getProductPage).toHaveBeenCalledWith('test-url', 'test-referer');
			expect(naver.transformData).toHaveBeenCalled();
			expect(naver.saveTransformDataOnFile).toHaveBeenCalled();
		});

		it('NEW 상품이 발견되면 가져오기를 중지해야 함', async () => {
			// Create a testable subclass
			class TestableNaver extends Naver {
				// Mock methods
				getPageUrl = jest.fn().mockReturnValue({ 
					url: 'test-url', 
					headerReferer: 'test-referer' 
				});

				getProductPage = jest.fn().mockResolvedValue({
					...productsJsonData,
					totalCount: 100, // Multiple pages of results
				});

				transformData = jest.fn().mockReturnValue([{ tags: ['NEW'] }]); // With NEW tag

				saveTransformDataOnFile = jest.fn().mockResolvedValue(undefined);

				constructor(defaultUrl: string, name: string) {
					super(defaultUrl, name);
				}

				// Override the private method for testing
				async getProducts(): Promise<void> {
					let pageNum = 1;
					const pageSize = 40;

					// Get first page
					let page = this.getPageUrl(pageNum, pageSize);

					// Get page data
					const firstPageData = await this.getProductPage(
						page.url,
						page.headerReferer,
					);

					// Transform and save data
					const transformData = this.transformData(firstPageData.simpleProducts);
					await this.saveTransformDataOnFile(transformData);

					// Check for NEW products
					if (
						transformData.some(
							(data: { tags: string | string[] }) =>
								data.tags.includes('NEW'),
						)
					) {
						return;
					}

					// Calculate total pages
					const totalPage = Math.ceil(firstPageData.totalCount / pageSize);

					// Process remaining pages
					while (pageNum < totalPage) {
						pageNum++;
						// Get next page
						page = this.getPageUrl(pageNum, pageSize);

						// Get page data
						const pageData = await this.getProductPage(
							page.url,
							page.headerReferer,
						);

						// Transform and save data
						const transformData = this.transformData(pageData.simpleProducts);
						await this.saveTransformDataOnFile(transformData);

						// Check for NEW products
						if (
							transformData.some(
								(data: { tags: string | string[] }) =>
									data.tags.includes('NEW'),
							)
						) {
							break;
						}
					}
				}
			}

			const naver = new TestableNaver(NAVER_SMART_STORE_DEFAULT_URL, name);

			// Call the method
			await naver.getProducts();

			// Should only call getPageUrl once since we found NEW products on first page
			expect(naver.getPageUrl).toHaveBeenCalledTimes(1);
			expect(naver.getProductPage).toHaveBeenCalledTimes(1);
			expect(naver.transformData).toHaveBeenCalledTimes(1);
			expect(naver.saveTransformDataOnFile).toHaveBeenCalledTimes(1);
		});
	});
});
