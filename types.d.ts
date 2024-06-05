export interface TGBodyMessage {
	message_id: number,
	from: {
		id: number,
		is_bot: boolean,
		first_name: string,
		username: string,
		language_code: string
	},
	chat: {
		id: number,
		first_name: string,
		username: string,
		type: string
	},
	date: number,
	text: string,
};
export interface LawSearch {
	message: TGBodyMessage,
	law_name: string,
	law_no: string | null | undefined,
	law_keyworks: string | null | undefined,
};
export interface OCSLawSection {
	sectionId: Number,
	sectionTypeId: string,
	sectionContent: string,
	sectionSeq: Number,
	sectionLabel: string,
};
export interface OCSLawInfo {
	respHeader: {
		[key: string]: any
	},
	respBody: {
		hasSection: boolean,
		lawInfo: {
			timelineId: string,
			timelineTypeId: string,
			timelineLawCode: string,
			lawCode: string,
			lawNameTh: string,
			lawNameEn: string,
			stateId: string,
			publishYearType: string,
			publishDateAd: string,
			effectiveDateStartAd: string,
		},
		lawSections: OCSLawSection[]
		[key: string]: any
	}
};
export interface WSMsgLaw {
	from: string,
	result: OCSLawInfo,
	message: TGBodyMessage,
	law_no: string | null | undefined,
	law_keyworks: string | null | undefined,
};
