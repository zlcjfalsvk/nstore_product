/**
 * 네이버 스마트스토어 스크래퍼
 * 
 * 이 모듈은 네이버 스마트스토어의 상품 정보를 스크래핑하는 기능을 제공합니다.
 */
import axios, { AxiosError } from 'axios';
import { Product, ProductPage, ITransformProduct } from './index';
import { Config, JsonDB } from 'node-json-db';
import { Sleep } from '../../util';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 마켓 정보 인터페이스
 */
interface MarketInfo {
  channel: {
    channelUid: string;
    channelName: string;
  };
  specialProducts: {
    bestProductNos?: number[];
    newProductNos?: number[];
  };
}

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
 * API 요청 설정
 */
const API_CONFIG = {
  /** API 요청 타임아웃 (ms) */
  TIMEOUT: 10000,
  /** 재시도 횟수 */
  RETRY_COUNT: 3,
  /** 재시도 간 대기 시간 (ms) */
  RETRY_DELAY: 1000,
  /** 페이지당 상품 수 */
  PAGE_SIZE: 40,
  /** API 요청 간 대기 시간 (ms) */
  REQUEST_DELAY: 500,
};

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
      console.log('🔍 스토어 정보를 가져오는 중...');
      
      // 스토어 정보 가져오기
      const marketInfo = await this.getMarketInfo();
      
      // 채널 정보 업데이트
      this.updateChannelInfo(marketInfo);
      
      console.log(`✅ 스토어 정보 확인: ${this.#channelName}`);
      console.log('📋 상품 정보 수집 시작...');
      
      // 상품 정보 가져오기
      await this.getProducts();
      
      console.log(`✅ 스크래핑 완료: ${this.#channelName}`);
      return this.#channelName;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error(`❌ 스크래핑 실패: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 마켓 정보를 기반으로 채널 정보를 업데이트합니다.
   * @param marketInfo 마켓 정보 객체
   */
  private updateChannelInfo(marketInfo: MarketInfo): void {
    // 채널 UID와 이름 설정
    this.#channelUid = marketInfo.channel.channelUid;
    this.#channelName = marketInfo.channel.channelName;

    // 디렉토리 생성 확인
    const dbDir = 'db';
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // 안전한 파일명 생성
    const safeChannelName = marketInfo.channel.channelName.replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
    const dbPath = path.join(dbDir, safeChannelName);

    // JSON DB 초기화
    this.#db = new JsonDB(
      new Config(
        dbPath,
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
  private async getMarketInfo(): Promise<MarketInfo> {
    const url = `${this.#defaultUrl}/i/v1/smart-stores?url=${this.#name}`;
    
    for (let retry = 0; retry < API_CONFIG.RETRY_COUNT; retry++) {
      try {
        const response = await axios.get(url, {
          timeout: API_CONFIG.TIMEOUT,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (!response.data?.channel?.channelUid) {
          throw new Error('잘못된 응답 형식');
        }
        
        return response.data;
      } catch (error) {
        if (retry === API_CONFIG.RETRY_COUNT - 1) {
          if (error instanceof AxiosError) {
            if (error.response?.status === 404) {
              throw new Error(`스토어를 찾을 수 없습니다: ${this.#name}`);
            }
            throw new Error(`API 요청 실패: ${error.message}`);
          }
          throw new Error(`${this.#name}의 정보를 가져올 수 없습니다`);
        }
        
        console.log(`⚠️ 재시도 ${retry + 1}/${API_CONFIG.RETRY_COUNT}...`);
        await Sleep(API_CONFIG.RETRY_DELAY);
      }
    }
    
    throw new Error('예상치 못한 오류');
  }

  /**
   * 모든 상품 정보를 가져와 처리합니다.
   */
  private async getProducts(): Promise<void> {
    let pageNum = 1;
    const pageSize = API_CONFIG.PAGE_SIZE;
    let totalProducts = 0;
    let hasNewProduct = false;

    try {
      // 첫 페이지 URL 생성
      let page = this.getPageUrl(pageNum, pageSize);

      // 첫 페이지 데이터 가져오기
      const firstPageData = await this.getProductPage(
        page.url,
        page.headerReferer,
      );

      if (!firstPageData.simpleProducts || firstPageData.simpleProducts.length === 0) {
        console.log('⚠️ 상품이 없습니다.');
        return;
      }

      // 데이터 변환 및 저장
      const transformData = this.transformData(firstPageData.simpleProducts);
      await this.saveTransformDataOnFile(transformData);
      totalProducts += transformData.length;

      // NEW 태그가 있는 상품이 있으면 종료
      if (transformData.some((data) => data.tags.includes(tag.NEW))) {
        hasNewProduct = true;
        console.log(
          `🆕 ${pageNum} 페이지에서 NEW 상품 발견 - 추가 수집 중단`,
        );
        return;
      }

      // 전체 페이지 수 계산
      const totalPage = Math.ceil(firstPageData.totalCount / pageSize);
      console.log(`📦 ${pageNum}/${totalPage} 페이지 완료 (${totalProducts}개 상품)`);
      pageNum++;

      // 나머지 페이지 처리
      while (pageNum <= totalPage && !hasNewProduct) {
        try {
          // 페이지 URL 생성
          page = this.getPageUrl(pageNum, pageSize);

          // 페이지 데이터 가져오기
          const pageData = await this.getProductPage(
            page.url,
            page.headerReferer,
          );

          if (!pageData.simpleProducts || pageData.simpleProducts.length === 0) {
            console.log(`⚠️ ${pageNum} 페이지에 상품이 없습니다.`);
            break;
          }

          // 데이터 변환 및 저장
          const transformData = this.transformData(pageData.simpleProducts);
          await this.saveTransformDataOnFile(transformData);
          totalProducts += transformData.length;

          console.log(`📦 ${pageNum}/${totalPage} 페이지 완료 (${totalProducts}개 상품)`);

          // NEW 태그가 있는 상품이 있으면 종료
          if (transformData.some((data) => data.tags.includes(tag.NEW))) {
            hasNewProduct = true;
            console.log(
              `🆕 ${pageNum}/${totalPage} 페이지에서 NEW 상품 발견 - 추가 수집 중단`,
            );
            break;
          }

          pageNum++;

          // API 속도 제한 방지를 위한 지연
          await Sleep(API_CONFIG.REQUEST_DELAY);
        } catch (error) {
          console.error(`❌ ${pageNum} 페이지 처리 중 오류:`, error);
          // 페이지 오류 발생 시 곈4속 진행
          pageNum++;
        }
      }

      console.log(`🏁 총 ${totalProducts}개의 상품 수집 완료`);
    } catch (error) {
      console.error('❌ 상품 수집 중 오류 발생:', error);
      throw error;
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
      try {
        // 필수 필드 검증
        if (!product.id || !product.productNo) {
          console.warn(`⚠️ 유효하지 않은 상품 데이터 발견, 건너뛰기`);
          continue;
        }

        // 필요한 정보만 추출하여 새 객체 생성
        const transformedProduct: ITransformProduct = {
          id: product.id.toString(),
          productNo: product.productNo.toString(),
          name: product.name || '상품명 없음',
          url: `${this.#defaultUrl}/${this.#name}/products/${product.id}`,
          salePrice: product.salePrice || 0,
          discountedSalePrice:
            product.benefitsView?.discountedSalePrice ||
            product.salePrice || 0,
          mobileDiscountedSalePrice:
            product.benefitsView?.mobileDiscountedSalePrice ||
            product.salePrice || 0,
          totalReviewCount: product.reviewAmount?.totalReviewCount || 0,
          tags: this.getTags(product.id),
        };

        transformedProducts.push(transformedProduct);
      } catch (error) {
        console.error(`⚠️ 상품 변환 실패 (ID: ${product.id}):`, error);
      }
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
    const savePromises: Promise<void>[] = [];
    
    for (const product of data) {
      const savePromise = (async () => {
        try {
          // 기존 데이터 가져오기
          const existingData = await this.#db.getObjectDefault(
            `/${product.id}`,
            {},
          );

          // 기존 데이터와 새 데이터 병합
          const mergedData = {
            ...existingData,
            ...product,
            updatedAt: new Date().toISOString(),
          };

          // DB에 저장
          await this.#db.push(`/${product.id}`, mergedData);

          console.log(
            `💾 저장: ${product.name.substring(0, 30)}... (ID: ${product.id})`,
          );
        } catch (error) {
          console.error(`❌ 저장 실패 (ID: ${product.id}):`, error);
        }
      })();
      
      savePromises.push(savePromise);
    }
    
    // 모든 저장 작업 완료 대기
    await Promise.all(savePromises);
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
    // 입력값 검증
    if (pageNum < 1 || pageSize < 1) {
      throw new Error('잘못된 페이지 매개변수');
    }

    // API URL 생성 (쿼리 파라미터 인코딩)
    const params = new URLSearchParams({
      categorySearchType: 'STDCATG',
      sortType: 'TOTALSALE',
      page: pageNum.toString(),
      pageSize: pageSize.toString(),
    });
    
    const url = `${this.#defaultUrl}/i/v2/channels/${encodeURIComponent(this.#channelUid)}/categories/ALL/products?${params}`;

    // 헤더 레퍼러 URL 생성
    const refererParams = new URLSearchParams({
      st: 'TOTALSALE',
      dt: 'BIG_IMAGE',
      page: pageNum.toString(),
      size: pageSize.toString(),
    });
    
    const headerReferer = `${this.#defaultUrl}/${encodeURIComponent(this.#name)}/category/ALL?${refererParams}`;

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
    for (let retry = 0; retry < API_CONFIG.RETRY_COUNT; retry++) {
      try {
        // API 요청 및 데이터 반환
        const response = await axios.get(url, {
          timeout: API_CONFIG.TIMEOUT,
          headers: {
            'Referer': headerReferer,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          },
        });

        if (!response.data) {
          throw new Error('비어있는 응답');
        }

        return response.data;
      } catch (error) {
        if (retry === API_CONFIG.RETRY_COUNT - 1) {
          if (error instanceof AxiosError) {
            if (error.response?.status === 429) {
              throw new Error('API 속도 제한 - 잠시 후 다시 시도해주세요');
            }
            throw new Error(`API 요청 실패: ${error.message}`);
          }
          throw error;
        }
        
        console.log(`⚠️ 페이지 요청 재시도 ${retry + 1}/${API_CONFIG.RETRY_COUNT}...`);
        await Sleep(API_CONFIG.RETRY_DELAY * (retry + 1)); // 지수 백오프
      }
    }
    
    throw new Error('페이지 데이터를 가져올 수 없습니다');
  }
}
