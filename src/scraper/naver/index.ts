/**
 * 네이버 스마트스토어 스크래퍼 모듈
 * 
 * 이 모듈은 네이버 스마트스토어에서 상품 정보를 스크래핑하는 기능을 제공합니다.
 */

export { Naver } from './naver';

/**
 * 변환된 상품 정보 인터페이스
 * 
 * 이 인터페이스는 API에서 받은 원본 상품 데이터를 가공하여
 * 필요한 정보만 포함하는 간소화된 형태를 정의합니다.
 */
export interface ITransformProduct {
  /** 상품 번호 */
  productNo: string;
  /** 상품 ID */
  id: string;
  /** 상품 이름 */
  name: string;
  /** 상품 URL */
  url: string;
  /** 원가 */
  salePrice: number;
  /** 할인가 */
  discountedSalePrice: number;
  /** 모바일 할인가 */
  mobileDiscountedSalePrice: number;
  /** 총 리뷰 수 */
  totalReviewCount: number;
  /** 상품 태그 (NEW, BEST 등) */
  tags: string[];
}

/**
 * 상품 페이지 인터페이스
 * 
 * 네이버 스마트스토어 API에서 반환하는 상품 페이지 정보를 정의합니다.
 */
export interface ProductPage {
  /** 정렬 유형 (예: TOTALSALE) */
  sortType: string;
  /** 현재 페이지 번호 */
  page: string;
  /** 페이지에 포함된 상품 목록 */
  simpleProducts: Product[];
  /** 전체 상품 수 */
  totalCount: number;
}

/**
 * 상품 인터페이스
 * 
 * 네이버 스마트스토어 API에서 반환하는 상품의 상세 정보를 정의합니다.
 * 이 인터페이스는 API에서 제공하는 원본 데이터 구조를 그대로 반영합니다.
 */
export interface Product {
  /** 상품 ID */
  id: number;
  /** 상품 카테고리 정보 */
  category: Category;
  /** 상품 이름 */
  name: string;
  /** 채널 정보 */
  channel: Channel;
  /** 스토어 전용 상품 여부 */
  storeKeepExclusiveProduct: boolean;
  /** 상품 번호 */
  productNo: number;
  /** 판매 가격 */
  salePrice: number;
  /** 판매 유형 */
  saleType: string;
  /** 상품 상태 유형 */
  productStatusType: string;
  /** 인증 유형 */
  authenticationType: string;
  /** SEO 정보 */
  seoInfo: SeoInfo;
  /** 옵션 사용 가능 여부 */
  optionUsable: boolean;
  /** 옵션 표준 */
  optionStandards: unknown[];
  /** 추가 상품 사용 가능 여부 */
  supplementProductUsable: boolean;
  /** 네이버 쇼핑 검색 정보 */
  naverShoppingSearchInfo: NaverShoppingSearchInfo;
  /** 구매 리뷰 정보 */
  purchaseReviewInfo: PurchaseReviewInfo;
  /** 미성년자 구매 가능 여부 */
  minorPurchasable: boolean;
  /** 장바구니 제한 여부 */
  isRestrictCart: boolean;
  /** 혜택 정보 */
  benefitsView: BenefitsView;
  /** 리뷰 수량 정보 */
  reviewAmount: ReviewAmount;
  /** 표시 가능 여부 */
  displayable: boolean;
  /** 배송 사용 가능 여부 */
  usableDelivery: boolean;
  /** 대표 이미지 URL */
  representativeImageUrl: string;
  /** 추가 이미지 URL 목록 */
  optionalImageUrls: string[];
  /** 상품 배송 정보 */
  productDeliveryInfo: ProductDeliveryInfo;
  /** 상세 내용 */
  detailContents: DetailContents;
  /** 장바구니 활성화 여부 */
  enableCart: boolean;
  /** 무료 배송 여부 */
  freeDelivery: boolean;
  /** 당일 배송 여부 */
  todayDelivery: boolean;
  /** 정기 구독 여부 */
  regularSubscription: boolean;
  /** 도착 보장 여부 */
  arrivalGuarantee: boolean;
  /** 구독 혜택 내용 */
  subscriptionBenefitContent: unknown[];
  /** RMID 목록 */
  rmids: unknown[];
  /** 렌탈 일회성 수수료 여부 */
  rentalOneTimeFee: boolean;
  /** 인증 표시 */
  authorizationDisplay: string;
  /** 카테고리 네비게이션 */
  categoryNavigations: CategoryNavigation[];
}

/**
 * 카테고리 인터페이스
 * 
 * 상품의 카테고리 정보를 정의합니다.
 */
interface Category {
  /** 전체 카테고리 ID */
  wholeCategoryId: string;
  /** 전체 카테고리 이름 */
  wholeCategoryName: string;
  /** 카테고리 ID */
  categoryId: string;
  /** 카테고리 이름 */
  categoryName: string;
}

/**
 * 채널 인터페이스
 * 
 * 스마트스토어 채널 정보를 정의합니다.
 */
interface Channel {
  /** 채널 번호 */
  channelNo: number;
  /** 계정 번호 */
  accountNo: number;
  /** 계정 ID */
  accountId: string;
  /** 채널 이름 (스토어 이름) */
  channelName: string;
}

/**
 * SEO 정보 인터페이스
 * 
 * 검색 엔진 최적화 관련 정보를 정의합니다.
 */
interface SeoInfo {}

/**
 * 네이버 쇼핑 검색 정보 인터페이스
 * 
 * 네이버 쇼핑에서 검색될 때 사용되는 정보를 정의합니다.
 */
interface NaverShoppingSearchInfo {
  /** 제조사 이름 */
  manufacturerName: string;
  /** 브랜드 이름 */
  brandName: string;
  /** 모델 이름 */
  modelName: string;
}

/**
 * 구매 리뷰 정보 인터페이스
 * 
 * 구매 리뷰 관련 설정을 정의합니다.
 */
interface PurchaseReviewInfo {
  /** 구매 리뷰 노출 여부 */
  purchaseReviewExposure: boolean;
}

/**
 * 혜택 정보 인터페이스
 * 
 * 상품에 적용되는 할인 및 포인트 혜택 정보를 정의합니다.
 */
interface BenefitsView {
  /** 할인된 판매 가격 */
  discountedSalePrice: number;
  /** 모바일에서 할인된 판매 가격 */
  mobileDiscountedSalePrice: number;
  /** 판매자 즉시 할인 금액 */
  sellerImmediateDiscountAmount: number;
  /** 모바일에서 판매자 즉시 할인 금액 */
  mobileSellerImmediateDiscountAmount: number;
  /** 관리자 즉시 할인 금액 */
  managerImmediateDiscountAmount: number;
  /** 모바일에서 관리자 즉시 할인 금액 */
  mobileManagerImmediateDiscountAmount: number;
  /** 할인 비율 */
  discountedRatio: number;
  /** 모바일에서 할인 비율 */
  mobileDiscountedRatio: number;
  /** 판매자 구매 포인트 */
  sellerPurchasePoint: number;
  /** 모바일에서 판매자 구매 포인트 */
  mobileSellerPurchasePoint: number;
  /** 판매자 고객 관리 포인트 */
  sellerCustomerManagementPoint: number;
  /** 모바일에서 판매자 고객 관리 포인트 */
  mobileSellerCustomerManagementPoint: number;
  /** 관리자 구매 포인트 */
  managerPurchasePoint: number;
  /** 모바일에서 관리자 구매 포인트 */
  mobileManagerPurchasePoint: number;
  /** 관리자 구매 추가 포인트 */
  managerPurchaseExtraPoint: number;
  /** 모바일에서 관리자 구매 추가 포인트 */
  mobileManagerPurchaseExtraPoint: number;
  /** 일반 구매 리뷰 포인트 */
  generalPurchaseReviewPoint: number;
  /** 프리미엄 구매 리뷰 포인트 */
  premiumPurchaseReviewPoint: number;
  /** 스토어 회원 리뷰 포인트 */
  storeMemberReviewPoint: number;
  /** 관리자 일반 구매 리뷰 포인트 */
  managerGeneralPurchaseReviewPoint: number;
  /** 관리자 프리미엄 구매 리뷰 포인트 */
  managerPremiumPurchaseReviewPoint: number;
  /** 선물 제공 여부 */
  givePresent: boolean;
  /** 텍스트 리뷰 포인트 */
  textReviewPoint: number;
  /** 사진/비디오 리뷰 포인트 */
  photoVideoReviewPoint: number;
  /** 사용 후 텍스트 리뷰 포인트 */
  afterUseTextReviewPoint: number;
  /** 사용 후 사진/비디오 리뷰 포인트 */
  afterUsePhotoVideoReviewPoint: number;
  /** 관리자 텍스트 리뷰 포인트 */
  managerTextReviewPoint: number;
  /** 관리자 사진/비디오 리뷰 포인트 */
  managerPhotoVideoReviewPoint: number;
  /** 관리자 사용 후 텍스트 리뷰 포인트 */
  managerAfterUseTextReviewPoint: number;
  /** 관리자 사용 후 사진/비디오 리뷰 포인트 */
  managerAfterUsePhotoVideoReviewPoint: number;
}

/**
 * 리뷰 수량 정보 인터페이스
 * 
 * 상품의 리뷰 관련 통계 정보를 정의합니다.
 */
interface ReviewAmount {
  /** 총 리뷰 수 */
  totalReviewCount: number;
  /** 프리미엄 리뷰 수 */
  premiumReviewCount: number;
  /** 평균 리뷰 점수 */
  averageReviewScore: number;
  /** 상품 만족도 백분율 */
  productSatisfactionPercent: number;
}

/**
 * 상품 배송 정보 인터페이스
 * 
 * 상품의 배송 관련 정보를 정의합니다.
 */
interface ProductDeliveryInfo {
  /** 배송비 유형 */
  deliveryFeeType: string;
  /** 기본 배송비 */
  baseFee: number;
  /** 배송 속성 유형 */
  deliveryAttributeType: string;
}

/**
 * 상세 내용 인터페이스
 * 
 * 상품의 상세 설명 내용을 정의합니다.
 */
interface DetailContents {
  /** 상세 내용 텍스트 */
  detailContentText: string;
  /** 에디터 유형 */
  editorType: string;
}

/**
 * 카테고리 네비게이션 인터페이스
 * 
 * 상품의 카테고리 네비게이션 정보를 정의합니다.
 */
interface CategoryNavigation {
  /** 카테고리 ID */
  categoryId: string;
  /** 카테고리 이름 */
  categoryName: string;
}
