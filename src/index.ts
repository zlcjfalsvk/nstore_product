/**
 * 네이버 스마트스토어 상품 정보 스크래핑 애플리케이션
 * 
 * 이 애플리케이션은 사용자가 입력한 네이버 스마트스토어 URL에서 
 * 상품 정보를 스크래핑하고 CSV 파일로 저장합니다.
 */

import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import * as fs from 'fs';
import * as path from 'path';
import { Parser } from '@json2csv/plainjs';
import { Naver } from './scraper';

// 네이버 스마트스토어 기본 URL
const NAVER_SMART_STORE_DEFAULT_URL = 'https://smartstore.naver.com';
// 데이터베이스 디렉토리
const DB_DIRECTORY = 'db';
// URL 검증 정규식
const STORE_URL_REGEX = new RegExp(`^${NAVER_SMART_STORE_DEFAULT_URL}/[a-zA-Z0-9_-]+$`);

let rl: readline.Interface;

/**
 * URL 유효성 검증 함수
 * @param url 검증할 URL
 * @returns 유효한 경우 true, 그렇지 않으면 false
 */
const validateUrl = (url: string): boolean => {
  // URL 형식 검증
  if (!STORE_URL_REGEX.test(url)) {
    return false;
  }
  
  // 경로 순회 공격 방지
  const storeName = url.replace(NAVER_SMART_STORE_DEFAULT_URL + '/', '');
  if (storeName.includes('..') || storeName.includes('/') || storeName.includes('\\')) {
    return false;
  }
  
  return true;
};

/**
 * 파일 경로 안전성 검증 함수
 * @param filePath 검증할 파일 경로
 * @returns 안전한 경로 반환
 */
const sanitizeFilePath = (filePath: string): string => {
  // 경로 정규화 및 안전한 파일명 생성
  const safeName = filePath.replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
  return path.join(process.cwd(), safeName);
};

/**
 * 애플리케이션의 메인 함수
 * 사용자 입력을 받고, 스크래핑을 시작하며, 결과를 CSV로 저장합니다.
 */
const start = async (): Promise<void> => {
  try {
    // 사용자 입력을 위한 인터페이스 생성
    rl = readline.createInterface({ input, output });

    // 스마트스토어 URL 입력 받기
    const answer = await rl.question(
      `네이버 스마트 스토어 사이트 입력 ex) ${NAVER_SMART_STORE_DEFAULT_URL}/dongsmarkett \n`,
    );

    // URL 유효성 검증
    if (!validateUrl(answer)) {
      console.error('❌ 잘못된 URL 형식입니다. 올바른 네이버 스마트스토어 URL을 입력해주세요.');
      return;
    }

    console.log(`✅ ${answer} 상품 리스트를 추출합니다.`);

    // 스토어 이름 추출 및 스크래퍼 초기화
    const storeName = answer.replace(NAVER_SMART_STORE_DEFAULT_URL + '/', '');
    const naverScraper = new Naver(NAVER_SMART_STORE_DEFAULT_URL, storeName);

    // 스크래핑 시작 및 스토어 이름 반환
    const marketReadableName = await naverScraper.Start();

    if (!marketReadableName) {
      console.error('❌ 스크래핑에 실패했습니다.');
      return;
    }

    // JSON 데이터를 CSV로 변환
    await convertJsonToCsv(marketReadableName);
  } catch (error) {
    console.error('❌ 오류가 발생했습니다:', error instanceof Error ? error.message : '알 수 없는 오류');
  }
};

/**
 * JSON 데이터를 CSV 파일로 변환하여 저장합니다.
 * @param marketReadableName 스토어 이름 (파일명으로 사용)
 */
const convertJsonToCsv = async (marketReadableName: string): Promise<void> => {
  try {
    // 안전한 파일 경로 생성
    const jsonFilePath = path.join(DB_DIRECTORY, `${marketReadableName}.json`);
    const csvFilePath = sanitizeFilePath(`${marketReadableName}.csv`);

    // 파일 존재 여부 확인
    if (!fs.existsSync(jsonFilePath)) {
      throw new Error(`JSON 파일을 찾을 수 없습니다: ${jsonFilePath}`);
    }

    // JSON 파일 읽기
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
    const jsonData = JSON.parse(jsonContent);

    // 상품 목록 배열 생성
    const productList = Object.values(jsonData);

    if (productList.length === 0) {
      console.log('⚠️ 변환할 상품 데이터가 없습니다.');
      return;
    }

    // CSV로 변환 (한글 컬럼명 사용)
    const parser = new Parser({
      fields: [
        { label: '상품번호', value: 'productNo' },
        { label: '상품ID', value: 'id' },
        { label: '상품명', value: 'name' },
        { label: '상품URL', value: 'url' },
        { label: '정가', value: 'salePrice' },
        { label: '할인가', value: 'discountedSalePrice' },
        { label: '모바일할인가', value: 'mobileDiscountedSalePrice' },
        { label: '리뷰수', value: 'totalReviewCount' },
        { label: '태그', value: 'tags' }
      ],
      transforms: [
        (item: Record<string, unknown>) => ({
          ...item,
          tags: Array.isArray(item.tags) ? item.tags.join(', ') : ''
        })
      ]
    });
    const parsedList = parser.parse(productList);

    // CSV 파일 저장 (BOM 추가로 한글 인코딩 문제 해결)
    const BOM = '\uFEFF';
    fs.writeFileSync(csvFilePath, BOM + parsedList, 'utf-8');
    console.log(`✅ ${path.basename(csvFilePath)} 파일이 생성되었습니다.`);
    console.log(`📊 총 ${productList.length}개의 상품이 변환되었습니다.`);
  } catch (error) {
    console.error('❌ CSV 변환 중 오류가 발생했습니다:', error instanceof Error ? error.message : '알 수 없는 오류');
    throw error;
  }
};

// 애플리케이션 시작
start()
  .then(async () => {
    // 종료 대기
    if (rl) {
      await rl.question(`\n종료하려면 Enter 키를 눌러주세요...`);
      rl.close();
    }
  })
  .catch((error) => {
    console.error('❌ 예기치 않은 오류가 발생했습니다:', error);
  })
  .finally(() => {
    if (rl) {
      rl.close();
    }
    process.exit(0);
  });
