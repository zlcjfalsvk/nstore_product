/**
 * 지정된 시간(밀리초) 동안 실행을 일시 중지합니다.
 * 
 * 이 함수는 API 요청 사이에 지연을 추가하여 
 * 서버 측 속도 제한(rate limiting)을 방지하는 데 사용됩니다.
 * 
 * @param ms 대기할 시간(밀리초)
 * @returns 지정된 시간 후에 해결되는 Promise
 */
export const Sleep = async (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};
