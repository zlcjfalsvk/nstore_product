/**
 * 네이버 스마트스토어 상품 정보 스크래핑 애플리케이션
 * 
 * 이 애플리케이션은 사용자가 입력한 네이버 스마트스토어 URL에서 
 * 상품 정보를 스크래핑하고 CSV 파일로 저장합니다.
 */

import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import * as fs from 'fs';
import { Parser } from '@json2csv/plainjs';
import { Naver } from './scraper';

// 네이버 스마트스토어 기본 URL
const NAVER_SMART_STORE_DEFAULT_URL = 'https://smartstore.naver.com';

let rl: readline.Interface;

/**
 * 애플리케이션의 메인 함수
 * 사용자 입력을 받고, 스크래핑을 시작하며, 결과를 CSV로 저장합니다.
 */
const start = async (): Promise<void> => {
  // 사용자 입력을 위한 인터페이스 생성
  rl = readline.createInterface({ input, output });

  // 스마트스토어 URL 입력 받기
  const answer = await rl.question(
    `네이버 스마트 스토어 사이트 입력 ex) ${NAVER_SMART_STORE_DEFAULT_URL}/dongsmarkett \r`,
  );

  console.log(`${answer} 상품 리스트를 추출 합니다`);

  // 스토어 이름 추출 및 스크래퍼 초기화
  const storeName = answer.replace(NAVER_SMART_STORE_DEFAULT_URL + '/', '');
  const naverScraper = new Naver(NAVER_SMART_STORE_DEFAULT_URL, storeName);

  // 스크래핑 시작 및 스토어 이름 반환
  const marketReadableName = await naverScraper.Start();

  // JSON 데이터를 CSV로 변환
  await convertJsonToCsv(marketReadableName);
};

/**
 * JSON 데이터를 CSV 파일로 변환하여 저장합니다.
 * @param marketReadableName 스토어 이름 (파일명으로 사용)
 */
const convertJsonToCsv = async (marketReadableName: string): Promise<void> => {
  // JSON 파일 읽기
  const jsonData = JSON.parse(
    fs.readFileSync(`db/${marketReadableName}.json`).toString(),
  );

  // 상품 목록 배열 생성
  const productList = [];
  for (const productId in jsonData) {
    productList.push(jsonData[productId]);
  }

  // CSV로 변환
  const parser = new Parser({});
  const parsedList = parser.parse(productList);

  // CSV 파일 저장
  fs.writeFileSync(`${marketReadableName}.csv`, parsedList);
  console.log(`${marketReadableName}.csv 파일이 생성되었습니다.`);
};

// 애플리케이션 시작
start().then(async () => {
  // 종료 대기
  await rl.question(`종료하기 위해 아무키나 눌러주세요`);
  rl.close();
  process.exit();
});
