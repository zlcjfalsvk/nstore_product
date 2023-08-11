import axios from 'axios';
import { Product, ProductPage, ITransformProduct } from './index';
import { Config, JsonDB } from 'node-json-db';
import { Sleep } from '../../util';

const tag = {
	NEW: 'NEW',
	BEST: 'BEST',
} as const;

export class Naver {
	#defaultUrl: string;
	#name: string;
	#db: JsonDB = {} as JsonDB;
	#channelUid: string = '';
	#channelName: string = '';

	bestProductNos: number[] = [];
	newProductNos: number[] = [];

	constructor(defaultUrl: string, name: string) {
		this.#defaultUrl = defaultUrl;
		this.#name = name;
	}

	async Start(): Promise<string> {
		try {
			await this.getMarketInfo();
			await this.getProducts();

			return this.#channelName;
		} catch (e) {
			console.error(e);
		}

		return '';
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

			this.bestProductNos =
				responseData.specialProducts.bestProductNos || [];
			this.newProductNos =
				responseData.specialProducts.newProductNos || [];
		} catch (e) {
			throw new Error(`${this.#name}의 channelUid를 알 수 없습니다`);
		}
	}

	private async getProducts(): Promise<void> {
		let pageNum = 1;
		const pageSize = 40;

		let page = this.getPageUrl(pageNum, pageSize);
		// 상품을 구하고 바로 가공을 한다
		const firstPageData: ProductPage = (
			await axios.get(page.url, {
				headers: {
					Referer: page.headerReferer,
				},
			})
		)?.data;

		const transformData = this.transformData(firstPageData.simpleProducts);
		await this.saveTransformDataOnFile(transformData);

		// 요청 사항 1
		if (transformData.filter((data) => data.tags.includes(tag.NEW))) {
			console.log(
				`${pageNum} Page NEW 발견으로 인한 종료 ----------------`,
			);
			return;
		}

		const totalPage = Math.ceil(firstPageData.totalCount / pageSize);
		console.log(`${pageNum++}/${totalPage} Page 완료 ----------------`);
		while (pageNum <= totalPage) {
			page = this.getPageUrl(pageNum, pageSize);
			const pageData: ProductPage = (
				await axios.get(page.url, {
					headers: {
						Referer: page.headerReferer,
					},
				})
			)?.data;

			const transformData = this.transformData(pageData.simpleProducts);
			await this.saveTransformDataOnFile(transformData);

			console.log(`${pageNum++}/${totalPage} Page 완료 ----------------`);
			// 빠른 호출은 LateLimit 걸릴 수 있어 sleep 추가
			await Sleep(500);

			// 요청 사항 1
			if (transformData.filter((data) => data.tags.includes(tag.NEW))) {
				console.log(
					`${pageNum}/${totalPage} Page NEW 발견으로 인한 종료 ----------------`,
				);
				break;
			}
		}
	}

	private transformData(data: Product[]): ITransformProduct[] {
		const item: ITransformProduct[] = [];
		for (const product of data) {
			const newTransformProduct: ITransformProduct = {
				id: product.id + '',
				productNo: product.productNo + '',
				name: product.name,
				url: `${this.#defaultUrl}/${this.#name}/products/${product.id}`,
				salePrice: product.salePrice,
				discountedSalePrice:
					product.benefitsView?.discountedSalePrice ||
					product.salePrice,
				mobileDiscountedSalePrice:
					product.benefitsView?.mobileDiscountedSalePrice ||
					product.salePrice,
				totalReviewCount: product.reviewAmount?.totalReviewCount || 0,
				tags: this.getTags(product.id),
			};
			item.push(newTransformProduct);
		}

		return item;
	}

	private async saveTransformDataOnFile(
		data: ITransformProduct[],
	): Promise<void> {
		for (const transformProduct of data) {
			const hasData = await this.#db.getObjectDefault(
				`/${transformProduct.id}`,
				{},
			);
			const newData = Object.assign({}, hasData, transformProduct);
			await this.#db.push(`/${transformProduct.id}`, newData);
			console.log(
				`저장 완료 id: ${transformProduct.id}, productNo: ${transformProduct.productNo}, name: ${transformProduct.name} ---`,
			);
		}
	}

	private getTags(id: number): string[] {
		const tags = [];
		if (this.bestProductNos.includes(id)) {
			tags.push(tag.BEST);
		}
		if (this.newProductNos.includes(id)) {
			tags.push(tag.NEW);
		}

		return tags;
	}

	private getPageUrl(
		pageNum: number,
		pageSize: number,
	): {
		url: string;
		headerReferer: string;
	} {
		const url = `${this.#defaultUrl}/i/v2/channels/${
			this.#channelUid
		}/categories/ALL/products?categorySearchType=STDCATG&sortType=TOTALSALE&page=${pageNum}&pageSize=${pageSize}`;

		const headerReferer = `${this.#defaultUrl}/${
			this.#name
		}/category/ALL?st=TOTALSALE&dt=BIG_IMAGE&page=${pageNum}&size=${pageSize}`;

		return { url, headerReferer };
	}
}
