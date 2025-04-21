/**
 * 네이버 스마트스토어 스크래퍼
 * 
 * 이 모듈은 네이버 스마트스토어의 상품 정보를 스크래핑하는 기능을 제공합니다.
 */
import axios from 'axios';
import { Product, ProductPage, ITransformProduct } from './index';
import { Config, JsonDB } from 'node-json-db';
import { Sleep } from '../../util';


// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/**
 * 상품 태그 상수
 */
const tag = {
  /** 신규 상품 태그 */
  NEW: 'NEW',
  /** 베스트 상품 태그 */
  BEST: 'BEST',
} as const;

/**
 * 네이버 스마트스토어 스크래퍼 클래스
 */
export class Naver {
  /** 네이버 스마트스토어 기본 URL */
  #defaultUrl: string;
  /** 스토어 이름 */
  #name: string;
  /** 상품 데이터를 저장할 JSON DB */
  #db: JsonDB = {} as JsonDB;
  /** 채널 UID */
  #channelUid: string = '';
  /** 채널 이름 */
  #channelName: string = '';

  /** 베스트 상품 번호 목록 */
  bestProductNos: number[] = [];
  /** 신규 상품 번호 목록 */
  newProductNos: number[] = [];

  /**
   * 네이버 스크래퍼 생성자
   * @param defaultUrl 네이버 스마트스토어 기본 URL
   * @param name 스토어 이름
   */
  constructor(defaultUrl: string, name: string) {
    this.#defaultUrl = defaultUrl;
    this.#name = name;
  }

  /**
   * 스크래핑 프로세스를 시작합니다.
   * @returns 채널 이름
   */
  async Start(): Promise<string> {
    try {
      // 스토어 정보 가져오기
      const marketInfo = await this.getMarketInfo();
      // 채널 정보 업데이트
      this.updateChannelInfo(marketInfo);
      // 상품 정보 가져오기
      await this.getProducts();
      return this.#channelName;
    } catch (e) {
      console.error(e);
    }

    return '';
  }

  /**
   * 마켓 정보를 기반으로 채널 정보를 업데이트합니다.
   * @param marketInfo 마켓 정보 객체
   */
  private updateChannelInfo(marketInfo: Record<string,  Any>): void {
    // 채널 UID와 이름 설정
    this.#channelUid = marketInfo.channel.channelUid;
    this.#channelName = marketInfo.channel.channelName;

    // JSON DB 초기화
    this.#db = new JsonDB(
      new Config(
        `db/${marketInfo.channel.channelName}`,
        true,  // 자동 저장
        false, // 휴먼 리더블 형식
        '/',   // 구분자
      ),
    );

    // 베스트 및 신규 상품 번호 설정
    this.bestProductNos = marketInfo.specialProducts.bestProductNos || [];
    this.newProductNos = marketInfo.specialProducts.newProductNos || [];
  }

  /**
   * 스토어의 기본 정보를 가져옵니다.
   * @returns 마켓 정보 객체
   * @throws 채널 UID를 찾을 수 없을 경우 에러
   */
  private async getMarketInfo(): Promise<Record<string, Any>> {
    const url = `${this.#defaultUrl}/i/v1/smart-stores?url=${this.#name}`;
    try {
      return (await axios.get(url))?.data;
    } catch (e) {
      throw new Error(`${this.#name}의 channelUid를 알 수 없습니다`);
    }
  }

  /**
   * 모든 상품 정보를 가져와 처리합니다.
   */
  private async getProducts(): Promise<void> {
    let pageNum = 1;
    const pageSize = 40; // 페이지당 상품 수

    // 첫 페이지 URL 생성
    let page = this.getPageUrl(pageNum, pageSize);

    // 첫 페이지 데이터 가져오기
    const firstPageData = await this.getProductPage(
      page.url,
      page.headerReferer,
    );

    // 데이터 변환 및 저장
    const transformData = this.transformData(firstPageData.simpleProducts);
    await this.saveTransformDataOnFile(transformData);

    // NEW 태그가 있는 상품이 있으면 종료
    if (transformData.some((data) => data.tags.includes(tag.NEW))) {
      console.log(
        `${pageNum} 페이지에서 NEW 상품 발견으로 인한 종료 ----------------`,
      );
      return;
    }

    // 전체 페이지 수 계산
    const totalPage = Math.ceil(firstPageData.totalCount / pageSize);
    console.log(`${pageNum++}/${totalPage} 페이지 완료 ----------------`);

    // 나머지 페이지 처리
    while (pageNum <= totalPage) {
      // 페이지 URL 생성
      page = this.getPageUrl(pageNum, pageSize);

      // 페이지 데이터 가져오기
      const pageData = await this.getProductPage(
        page.url,
        page.headerReferer,
      );

      // 데이터 변환 및 저장
      const transformData = this.transformData(pageData.simpleProducts);
      await this.saveTransformDataOnFile(transformData);

      console.log(`${pageNum++}/${totalPage} 페이지 완료 ----------------`);

      // API 속도 제한 방지를 위한 지연
      await Sleep(500);

      // NEW 태그가 있는 상품이 있으면 종료
      if (transformData.some((data) => data.tags.includes(tag.NEW))) {
        console.log(
          `${pageNum}/${totalPage} 페이지에서 NEW 상품 발견으로 인한 종료 ----------------`,
        );
        break;
      }
    }
  }

  /**
   * API에서 받은 상품 데이터를 변환합니다.
   * @param data 원본 상품 데이터 배열
   * @returns 변환된 상품 데이터 배열
   */
  private transformData(data: Product[]): ITransformProduct[] {
    const transformedProducts: ITransformProduct[] = [];

    for (const product of data) {
      // 필요한 정보만 추출하여 새 객체 생성
      const transformedProduct: ITransformProduct = {
        id: product.id.toString(),
        productNo: product.productNo.toString(),
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

      transformedProducts.push(transformedProduct);
    }

    return transformedProducts;
  }

  /**
   * 변환된 상품 데이터를 파일에 저장합니다.
   * @param data 변환된 상품 데이터 배열
   */
  private async saveTransformDataOnFile(
    data: ITransformProduct[],
  ): Promise<void> {
    for (const product of data) {
      // 기존 데이터 가져오기
      const existingData = await this.#db.getObjectDefault(
        `/${product.id}`,
        {},
      );

      // 기존 데이터와 새 데이터 병합
      const mergedData = Object.assign({}, existingData, product);

      // DB에 저장
      await this.#db.push(`/${product.id}`, mergedData);

      console.log(
        `저장 완료 - ID: ${product.id}, 상품번호: ${product.productNo}, 상품명: ${product.name} ---`,
      );
    }
  }

  /**
   * 상품 ID에 따른 태그 목록을 반환합니다.
   * @param id 상품 ID
   * @returns 태그 배열
   */
  private getTags(id: number): string[] {
    const tags: string[] = [];

    // BEST 태그 추가
    if (this.bestProductNos.includes(id)) {
      tags.push(tag.BEST);
    }

    // NEW 태그 추가
    if (this.newProductNos.includes(id)) {
      tags.push(tag.NEW);
    }

    return tags;
  }

  /**
   * 페이지 번호와 크기에 따른 API URL과 헤더 정보를 생성합니다.
   * @param pageNum 페이지 번호
   * @param pageSize 페이지 크기
   * @returns URL과 헤더 레퍼러 정보
   */
  private getPageUrl(
    pageNum: number,
    pageSize: number,
  ): {
    url: string;
    headerReferer: string;
  } {
    // API URL 생성
    const url = `${this.#defaultUrl}/i/v2/channels/${
      this.#channelUid
    }/categories/ALL/products?categorySearchType=STDCATG&sortType=TOTALSALE&page=${pageNum}&pageSize=${pageSize}`;

    // 헤더 레퍼러 URL 생성
    const headerReferer = `${this.#defaultUrl}/${
      this.#name
    }/category/ALL?st=TOTALSALE&dt=BIG_IMAGE&page=${pageNum}&size=${pageSize}`;

    return { url, headerReferer };
  }

  /**
   * 상품 페이지 데이터를 가져옵니다.
   * @param url API URL
   * @param headerReferer 헤더 레퍼러
   * @returns 상품 페이지 데이터
   */
  private async getProductPage(
    url: string,
    headerReferer: string,
  ): Promise<ProductPage> {
    // API 요청 및 데이터 반환
    return (
      await axios.get(url, {
        headers: {
          Referer: headerReferer,
        },
      })
    ).data;
  }
}
