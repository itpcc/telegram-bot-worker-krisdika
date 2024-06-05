import { chromium } from 'playwright';
import { type LawSearch, type WSMsgLaw } from './types';

const WS_RETRY_SECS = 5;

(async () => {
	console.info('START | start program.');

	const browser = await chromium.launch();
	let wsTimeoutInstance: ReturnType<typeof setTimeout> | undefined;
	let curWSInstance: WebSocket | undefined;
	const startWebSocket = () => {
		const socket = new WebSocket(process.env.WS_HOST as string, {
			// @ts-expect-error: ts(2353)
			headers: {
				authorization: `Bearer ${encodeURIComponent(
					process.env.CHATBOT_TOKEN_LAW as string
				)}`
			}
		});

		socket.addEventListener('open', async () => {
			console.log('ws::open | Connection start');
		});

		socket.addEventListener("message", async (event) => {
			if (event.type !== 'message') return;

			let obj: LawSearch | undefined;

			try {
				obj = JSON.parse(event.data) as LawSearch;
				console.debug('ws::message | obj', obj);
			} catch (e) {
				console.error('# ws::message | error', e);
				return;
			}

			let latCat = [];

			if (obj.law_name.indexOf('ประมวล') === 0) {
				latCat.push({
					"value": "1D",
					"label": "ประมวลกฎหมาย"
				});
			}

			if (obj.law_name.indexOf('พระราช') === 0) {
				latCat = latCat.concat([
					{
						"value": "1B",
						"label": "พระราชบัญญัติ",
					},
					{
						"value": "1C",
						"label": "พระราชกำหนด"
					},
					{
						"value": "1A",
						"label": "พระราชบัญญัติประกอบรัฐธรรมนูญ"
					}
				]);
			}

			const query = new URLSearchParams();
			query.append('keyword', obj.law_name);
			query.append('currentTabView', 'law');
			query.append('paginationReq', JSON.stringify({"currentPage":1,"pageSize":20}));
			query.append('searchForm', JSON.stringify({
				"lawCategoryIds": latCat,
				"timelineTypeIds": [
					{
						"value": "4",
						"label": "กฎหมายฉบับปัจจุบัน"
					}
				],
				"publishYearAds": [],
				"indexCharCategories": [],
				"lawTagIds": [],
				"actingPersonIds": [],
				"isTranslated": false
			}));
			query.append('searchSortOption', JSON.stringify({
				"all": {
					"operatorName": "dataUpdateDTM",
					"sortOrder": "NONE"
				},
				"law": {
					"operatorName": "publishDate",
					"sortOrder": "NONE"
				},
				"comment": {
					"operatorName": "explainYear",
					"sortOrder": "NONE"
				},
				"web": {
					"operatorName": "dataUpdateDTM",
					"sortOrder": "NONE"
				},
				"file": {
					"operatorName": "dataUpdateDTM",
					"sortOrder": "NONE"
				}
			}));

			const url = 'https://www.ocs.go.th/council-of-state/#/public/search?'+query.toString();
			const page = await browser.newPage();

			// Sniff for Request replay
			page.on('response', async res => {
				if (
					res.url() === 'https://www.ocs.go.th/ocs-api/public/doc/getLawDoc' &&
					res.status() === 200 &&
					res.headers()['content-type'] === 'application/json'
				) {
					const result = await res.json();
					socket.send(JSON.stringify({
						...obj,
						from: 'law',
						result,
					} as WSMsgLaw));

					console.log('ws::message | Law text sent ');
					page.close();
				}
			});

			await page.goto(url);
			await page.waitForLoadState('load');
			await page.locator(
				'app-public-search-tab-law > app-search-result-law > .row .pointer',
				{
					hasText: obj.law_name
				}
			).first().click();
			console.log('ws::message | Fetch law ', page.url());
		});

		// socket closed
		socket.addEventListener("close", async (event) => {
			console.log('ws::close | Closed due to ', event.reason);

			if (event.code !== 1000) {
				console.info(`ws::close | Retrying in ${WS_RETRY_SECS} seconds`);
				wsTimeoutInstance = setTimeout(() => startWebSocket(), WS_RETRY_SECS * 1000);
			}
		});

		curWSInstance = socket;
	}

	// catching signals and do something before exit
	[
		'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
		'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
	].forEach(function (sig) {
		process.on(sig, async () => {
			console.log(`process::${sig} | Starting graceful shutdown.`);
			curWSInstance?.close(1000, 'Graceful shutdown');
			await browser.close();
			console.info('END | end program.');
		});
	});

	startWebSocket();
})();
