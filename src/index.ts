import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

import { Naver } from './scraper';

const NAVER_SMART_STORE_DEFAULT_URL = 'https://smartstore.naver.com';

let rl: readline.Interface;
const start = async () => {
	rl = readline.createInterface({ input, output });
	const answer = await rl.question(
		`네이버 스마트 스토어 사이트 입력 ex) ${NAVER_SMART_STORE_DEFAULT_URL}/dongsmarkett \r`,
	);

	console.log(`${answer} 상품 리스트를 추출 합니다`);

	const naverScraper = new Naver(
		NAVER_SMART_STORE_DEFAULT_URL,
		answer.replace(NAVER_SMART_STORE_DEFAULT_URL + '/', ''),
	);

	await naverScraper.Start();
};

start().then(async () => {
	await rl.question(`종료하기 위해 아무키나 눌러주세요`);
	rl.close();
	process.exit();
});
