'use strict';

const puppeteer = require("puppeteer");

const uri_utils = require("./utils/uri");
	
const launchArgs = {
	headless: false,
	args: ['--no-sandbox', '--disable-setuid-sandbox']
}

const child_choice_selector = (parentSelector, choiceIdx) => {
	return parentSelector +":nth-child(" + choiceIdx + ")";
}

const click = (page, selector) => Promise.all([
      page.click(selector),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
]);

const login = async (page, credentials) => {
	console.log("[LOGIN] Entering email address.");
	try {
		await page.focus("input#useridInput.text-input");
		await page.keyboard.type(credentials.emailAddress);
		await click(page, "button.btn.btn--arrow.btn--full");
	} catch (error) {
		console.error(error);
		return false;
	}


	console.log("[LOGIN] Entering password.");
	try {
		await page.focus("input#password.text-input");
		await page.keyboard.type(credentials.password);
		await click(page, "button.btn.btn--arrow.btn--full");
	} catch (error) {
		console.error(error);
		return false;
	}
	
	console.log("[LOGIN] Entering TOTP.");
	try {
		await page.focus("input#totp.text-input");
		await page.keyboard.type(credentials.totp);
		await click(page, "button.btn.btn--arrow.btn--full");
	} catch (error) {
		console.error(error);
		return false;
	}

	return await page.url() == "https://m.uber.com/looking";
}

const auth = async (page, credentials) => {
	const uri = uri_utils.base_uri(await page.url());
	if (uri == "https://auth.uber.com") {
		console.error("[AUTH] Not logged in. Logging in.")
		const loggedIn = await login(page, credentials);
		console.log("[AUTH] Logged in succeeded: " + loggedIn)
		return loggedIn ? JSON.stringify(await page.cookies()) : null;
	} else if (uri == "https://m.uber.com") {
		console.log("[AUTH] Logged in.");
		return JSON.stringify(await page.cookies());
	} else {
		console.error("Unrecognized login URI: " + uri);
		return null;
	}
};

const enter_address = async (address, page) => {
	await page.focus('input');
	await page.keyboard.type(address);
	await page.waitFor(2000);
}

const click_address_option = async (option, page) => {
	const choiceSelector = child_choice_selector("div[data-test=list-container] > div", option);
	await click(page, choiceSelector);
}

const enter_and_click_address = async (address, page) => {
	await enter_address(address.address, page);
	await click_address_option(address.option, page);
}

const search_address = async (address, page) => {
	await enter_address(address, page);
	
	const results = await page.evaluate(() => {
		const results = Array.from(document.querySelectorAll("div[data-test=list-container] > div"));
		return results.map(div => div.children[1].innerText)
					  .filter(txt => !txt.match(/Allow location access/))
					  .map((item,idx) => (idx+1) + ". " + item)

	});

	return results;
}

const order_trip = async (choice, page) => {
	await page.waitForSelector("div[data-test=tiers-container] > div");	
	const choiceSelector = child_choice_selector("div[data-test=tiers-container] > div", choice);
	await page.click(choiceSelector);
	await page.waitFor(2000);

	await page.waitForSelector("div[data-test=request-trip-button-container] > button");
	await page.click("div[data-test=request-trip-button-container] > button");
	await page.waitFor(2000);
	
	// handle surge pricing
	const isSurge = await page.evaluate(() => !!document.querySelector("div[data-test=question-description]") && document.querySelector("div[data-test=question-description]").previousSibling.innerText.indexOf("Fares are slightly higher due to increased demand.") > -1);
	if (isSurge) {
		await page.click("div[data-test=question-description] + div > div + div > button");
	}

	// handle uber pool selection
	const isPool = await page.evaluate(() => !!document.querySelector("div[data-test=background]") && document.querySelector("div[data-test=background] + div + div > div > div > div").innerText.indexOf("How many seats do you need?") > -1);
	if (isPool) {
		await page.click("div[data-test=background] + div + div > div > div:nth-child(2)");			
	}

	await page.waitForFunction(() => !!document.querySelector("div[data-test=top-section-container]") && document.querySelector("div[data-test=top-section-container]").innerText.indexOf("Your driver") > -1);
	const ride_details = await page.evaluate(() => document.querySelector("div[data-test=bottom-section-container] > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1)").innerText);
	await page.click("div[data-test=bottom-section-container] > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1)");
	const phone_details = await page.evaluate(() => document.querySelector("div[data-test=x-mark] + div").firstChild.childNodes[1].innerText);
	const phone_number = "+" + phone_details.split("+")[1];
	return [ride_details, phone_number];
}

const search_rates = async (page) => {
	try {
		await page.waitForSelector("div[data-test=finalise-container]", {timeout: 10000});
	} catch (e) {
		console.log("Timed out waiting for rates. Probably something wrong with the route");
		return [];
	}
	return await page.evaluate(() => {
		const results = Array.from(document.querySelectorAll("div[data-test=tiers-container] > div"));
		return results.map((item,idx) => (idx+1) + ". " + item.innerText)
	});
}

const execute_in_page = async (fnc, cookies) => {
	console.log('launching browser');
	const browser = await puppeteer.launch(launchArgs);
	const page = await browser.newPage();
	await page.setCookie(...JSON.parse(cookies));
	
	let result;

	try {
		await page.goto("https://m.uber.com", {waitUntil: 'networkidle2'});
		result = await fnc(page);		
	} catch (e) {
		result = e.message;
	}

	await browser.close();
	console.log('closed browser');

	return result;
}

const execute_in_page_past_auth = async (fnc, cookies) => {
	const result = await execute_in_page(async (page) => {
		const uri = uri_utils.base_uri(await page.url());

		if (uri != "https://m.uber.com") {
			console.error("Unrecognized login URI: " + uri);
			console.error("Auth failed. Exiting...");
			return "Error: uber auth failed.";
		}

		let result;
		try {
			result = await fnc(page);
		} catch (e) {
			result = e.message;
		}
		return result;
	}, cookies);
	return result;
}

const login_with_totp = async (totp) => {
	return await execute_in_page(async (page) => {
		const credentials = {
			emailAddress: process.env.UBER_EMAIL,
			totp: totp,
			password: process.env.UBER_PASSWORD
		};
		return await auth(page, credentials);
	}, '[]');
}

const lookup_address = async (queryAddress, cookies) => {
	return await execute_in_page_past_auth(async (page) => {
		return await search_address(queryAddress, page);
	}, cookies);
}

const lookup_rates = async (src, dest, cookies) => {
	return await execute_in_page_past_auth(async (page) => {
		await enter_and_click_address(src, page);
		await enter_and_click_address(dest, page);
		return await search_rates(page);
	}, cookies);
}

const book_trip = async (src, dest, travel_option, cookies) => {
	return await execute_in_page_past_auth(async (page) => {
		await enter_and_click_address(src, page);
		await enter_and_click_address(dest, page);
		return await order_trip(travel_option, page);
	}, cookies);
}

const cancel_trip = async (cookies) => {
	return await execute_in_page_past_auth(async (page) => {
		try {
			await page.waitForSelector("div[data-test=list-container] + div > div > button");
			await page.click("div[data-test=list-container] + div > div > button");
			await page.waitFor(1000);
			await page.waitForSelector("div[data-test=question-description] + div > div + div > button");
			await page.click("div[data-test=question-description] + div > div + div > button");
			await page.waitFor(1000);
		} catch (error) {
			console.log("error cancelling trip: " + error);
			return false;	
		}
		return true;
	}, cookies);
}

/* External API */
exports.login_with_totp = login_with_totp;
exports.lookup_address = lookup_address;
exports.lookup_rates = lookup_rates;
exports.book_trip = book_trip;
exports.cancel_trip = cancel_trip;
