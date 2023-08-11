export { Naver } from './naver';

export interface ITransformProduct {
	productNo: string;
	id: string;
	name: string;
	url: string;
	salePrice: number; // 원가
	discountedSalePrice: number; // 할인가
	mobileDiscountedSalePrice: number; // 모바일 할인가
	totalReviewCount: number;
	tags: string[];
}

export interface ProductPage {
	sortType: string;
	page: string;
	simpleProducts: Product[];
	totalCount: number;
}

export interface Product {
	id: number;
	category: Category;
	name: string;
	channel: Channel;
	storeKeepExclusiveProduct: boolean;
	productNo: number;
	salePrice: number;
	saleType: string;
	productStatusType: string;
	authenticationType: string;
	seoInfo: SeoInfo;
	optionUsable: boolean;
	optionStandards: unknown[];
	supplementProductUsable: boolean;
	naverShoppingSearchInfo: NaverShoppingSearchInfo;
	purchaseReviewInfo: PurchaseReviewInfo;
	minorPurchasable: boolean;
	isRestrictCart: boolean;
	benefitsView: BenefitsView;
	reviewAmount: ReviewAmount;
	displayable: boolean;
	usableDelivery: boolean;
	representativeImageUrl: string;
	optionalImageUrls: string[];
	productDeliveryInfo: ProductDeliveryInfo;
	detailContents: DetailContents;
	enableCart: boolean;
	freeDelivery: boolean;
	todayDelivery: boolean;
	regularSubscription: boolean;
	arrivalGuarantee: boolean;
	subscriptionBenefitContent: unknown[];
	rmids: unknown[];
	rentalOneTimeFee: boolean;
	authorizationDisplay: string;
	categoryNavigations: CategoryNavigation[];
}

interface Category {
	wholeCategoryId: string;
	wholeCategoryName: string;
	categoryId: string;
	categoryName: string;
}

interface Channel {
	channelNo: number;
	accountNo: number;
	accountId: string;
	channelName: string;
}

interface SeoInfo {}

interface NaverShoppingSearchInfo {
	manufacturerName: string;
	brandName: string;
	modelName: string;
}

interface PurchaseReviewInfo {
	purchaseReviewExposure: boolean;
}

interface BenefitsView {
	discountedSalePrice: number;
	mobileDiscountedSalePrice: number;
	sellerImmediateDiscountAmount: number;
	mobileSellerImmediateDiscountAmount: number;
	managerImmediateDiscountAmount: number;
	mobileManagerImmediateDiscountAmount: number;
	discountedRatio: number;
	mobileDiscountedRatio: number;
	sellerPurchasePoint: number;
	mobileSellerPurchasePoint: number;
	sellerCustomerManagementPoint: number;
	mobileSellerCustomerManagementPoint: number;
	managerPurchasePoint: number;
	mobileManagerPurchasePoint: number;
	managerPurchaseExtraPoint: number;
	mobileManagerPurchaseExtraPoint: number;
	generalPurchaseReviewPoint: number;
	premiumPurchaseReviewPoint: number;
	storeMemberReviewPoint: number;
	managerGeneralPurchaseReviewPoint: number;
	managerPremiumPurchaseReviewPoint: number;
	givePresent: boolean;
	textReviewPoint: number;
	photoVideoReviewPoint: number;
	afterUseTextReviewPoint: number;
	afterUsePhotoVideoReviewPoint: number;
	managerTextReviewPoint: number;
	managerPhotoVideoReviewPoint: number;
	managerAfterUseTextReviewPoint: number;
	managerAfterUsePhotoVideoReviewPoint: number;
}

interface ReviewAmount {
	totalReviewCount: number;
	premiumReviewCount: number;
	averageReviewScore: number;
	productSatisfactionPercent: number;
}

interface ProductDeliveryInfo {
	deliveryFeeType: string;
	baseFee: number;
	deliveryAttributeType: string;
}

interface DetailContents {
	detailContentText: string;
	editorType: string;
}

interface CategoryNavigation {
	categoryId: string;
	categoryName: string;
}
