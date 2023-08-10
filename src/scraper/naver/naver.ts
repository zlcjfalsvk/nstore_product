import axios from 'axios';
import { Product, ProductPage, TransformProduct } from './index';
import { Config, JsonDB } from 'node-json-db';

export class Naver {
	#defaultUrl: string;
	#name: string;
	#db: JsonDB = {} as JsonDB;
	#channelUid: string = '';
	#channelName: string = '';

	constructor(defaultUrl: string, name: string) {
		this.#defaultUrl = defaultUrl;
		this.#name = name;
	}

	async Start(): Promise<void> {
		try {
			await this.getMarketInfo();
			await this.getProducts();
		} catch (e) {
			console.error(e);
		}
	}

	private async getMarketInfo(): Promise<void> {
		const url = `${this.#defaultUrl}/i/v1/smart-stores?url=${this.#name}`;
		try {
			const responseData = (await axios.get(url))?.data;

			this.#channelUid = responseData.channel.channelUid;
			this.#channelName = responseData.channel.channelName;
			this.#db = new JsonDB(
				new Config(
					`db/${responseData.channel.channelName}`,
					true,
					false,
					'/',
				),
			);
		} catch (e) {
			throw new Error(`${this.#name}의 channelUid를 알 수 없습니다`);
		}
	}

	private async getProducts(): Promise<void> {
		const pageNum = 1,
			pageSize = 40;

		const url = `${this.#defaultUrl}/i/v2/channels/${
			this.#channelUid
		}/categories/ALL/products?categorySearchType=STDCATG&sortType=TOTALSALE&page=${pageNum}&pageSize=${pageSize}`;

		const headerReferer = `${this.#defaultUrl}/${
			this.#name
		}/category/ALL?st=TOTALSALE&dt=BIG_IMAGE&page=${pageNum}&size=${pageSize}`;

		// 상품을 구하고 바로 가공을 한다
		const firstPageData: ProductPage = (
			await axios.get(url, {
				headers: {
					Referer: headerReferer,
				},
			})
		)?.data;
		await this.saveTransformDataOnFile(
			this.transformData(firstPageData.simpleProducts),
		);

		// const totalPage = Math.ceil(pageSize / firstPageData.totalCount);
	}

	private transformData(data: Product[]): TransformProduct[] {
		const item: TransformProduct[] = [];
		for (const product of data) {
			const newTransformProduct: TransformProduct = {
				id: product.id + '',
				productNo: product.productNo + '',
				name: product.name,
				url: `${this.#defaultUrl}/${product.name}/products/${
					product.productNo
				}`,
				salePrice: product.salePrice,
				discountedSalePrice:
					product.benefitsView?.discountedSalePrice ||
					product.salePrice,
				mobileDiscountedSalePrice:
					product.benefitsView?.mobileDiscountedSalePrice ||
					product.salePrice,
				totalReviewCount: product.reviewAmount?.totalReviewCount || 0,
			};
			item.push(newTransformProduct);
		}

		return item;
	}

	private async saveTransformDataOnFile(
		data: TransformProduct[],
	): Promise<void> {
		for (const transformProduct of data) {
			const hasData = await this.#db.getObjectDefault(
				`/${transformProduct.id}`,
				{},
			);
			const newData = Object.assign({}, hasData, transformProduct);
			await this.#db.push(`/${transformProduct.id}`, newData);
		}
	}
}
