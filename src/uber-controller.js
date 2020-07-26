'use strict';

const puppeteer = require("puppeteer");

const uri_utils = require("./utils/uri");
	
const defaultLaunchArgs = {
	headless: false,
	args: ['--no-sandbox', '--disable-setuid-sandbox']
}

const _child_choice_selector = (parentSelector, choiceIdx) => {
	return parentSelector +":nth-child(" + choiceIdx + ")";
}

const _wait_for_selector_and_click = async (page,
											selector,
											{
												desc = "",
												delay = 1000,
												timeout = 10000
											} =
												{
													desc: "",
													delay: 1000,
													timeout: 10000
												}) => {
	console.log(`Waiting for selector (${desc}): ${selector}`);
	await page.waitForSelector(selector, {timeout: timeout});
	console.log(`Selector found in page`);
	await page.click(selector);
	console.log(`Clicked selector. Now waiting ${delay}ms`);
	await page.waitFor(delay);
	console.log(`Done waiting.`);
}

const _wait_for_selector_and_select = async (page,
											 selector,
											 value,
											 {
												 desc = "",
												 delay = 1000,
												 timeout = 10000,
												 hideValue = false,
											 } =
												 {
													 desc: "",
													 delay: 1000,
													 timeout: 10000,
													 hideValue: false,
												 }) => {
	console.log(`Waiting for selector (${desc}): ${selector}`);
	await page.waitForSelector(selector, {timeout: timeout});
	console.log(`Selector found in page`);
	await page.select(selector, value);
	const redactedValue = hideValue ? "*******" : value;
	console.log(`Selected ${redactedValue} from dropdown. Now waiting ${delay}ms`);
	await page.waitFor(delay);
	console.log(`Done waiting.`);
}

const _wait_for_selector_and_type = async (page,
										   selector,
										   value,
										   {
											   desc = "",
											   delay = 1000,
											   timeout = 10000,
											   hideValue = false,
										   } =
											   {
												   desc: "",
												   delay: 1000,
												   timeout: 10000,
												   hideValue: false,
											   }) => {
	console.log(`Waiting for selector (${desc}): ${selector}`);
	await page.waitForSelector(selector, {timeout: timeout});
	console.log(`Selector found in page`);
	await page.type(selector, value);
	const redactedValue = hideValue ? "*******" : value;
	console.log(`Typed ${redactedValue} into field. Now waiting ${delay}ms`);
	await page.waitFor(delay);
	console.log(`Done waiting.`);
}

const _click = (page, selector) => Promise.all([
	  page.evaluate((selector) => document.querySelector(selector).click(), selector),
]);

const _click_and_wait_ms = async (page, selector, ms) => {
	  await page.click(selector);
	  await page.waitFor(ms);
}

const _click_and_wait_ms_deprecated = (page, selector, ms) => Promise.all([
	  page.evaluate((selector) => document.querySelector(selector).click(), selector),
      page.waitFor(ms),
]);

const _wait_for_selector = async (page, selector, delay, timeout) => {
	await page.waitForSelector(selector, {timeout: timeout});
	await page.waitFor(delay);
}


const _login = async (page, credentials) => {
	const COUNTRY_CODE_SELECTOR = "select[name=countryCode]"
	const PHONE_NUMBER_SELECTOR = "input#mobile[name=phoneNumber]"
	const NEXT_BUTTON_SELECTOR = "button#next-button[type=submit]"
	const TOTP_SELECTOR = "input#totp[name=totp][type=text]"
	const PASSWORD_SELECTOR = "input#password[name=password][type=password]"

	console.log("[LOGIN] Entering phone number.");
	try {
		await _wait_for_selector_and_select(page, COUNTRY_CODE_SELECTOR, credentials.countryCode, {desc: "countryCode"});
		await _wait_for_selector_and_type(page, PHONE_NUMBER_SELECTOR, credentials.phoneNumber, {desc: "phoneNumber"});
		await _wait_for_selector_and_click(page, NEXT_BUTTON_SELECTOR, {desc: "next button", delay: 5000});
		const hasCaptcha = await page.evaluate(() => !!document.getElementById("recaptcha-accessible-status"));
		if (hasCaptcha) {
			console.log("detected captcha on login... waiting 1min for user to sort it out...");
			await page.waitFor(60000);
		}
	} catch (error) {
		console.error(error);
		return false;
	}

	try {
		await page.$(TOTP_SELECTOR);
		console.log("[LOGIN] Entering TOTP.");
		try {
			await _wait_for_selector_and_type(page, TOTP_SELECTOR, credentials.totp, {desc: "totp"});
			await _wait_for_selector_and_click(page, NEXT_BUTTON_SELECTOR, {desc: "next button"});
		} catch (error) {
			console.error(error);
			return false;
		}		
	} catch (error) {
		await page.waitForNavigation({ waitUntil: 'networkidle0' });
	}

	console.log("[LOGIN] Entering password.");
	try {
		await _wait_for_selector_and_type(page, PASSWORD_SELECTOR, credentials.password, {desc: 'password', delay: 1000, timeout: 10000, hideValue: true});
		await _wait_for_selector_and_click(page, NEXT_BUTTON_SELECTOR, {desc: "next button", delay: 5000});
	} catch (error) {
		console.error(error);
		return false;
	}

	return await page.url() === "https://m.uber.com/looking";
}

const _enter_address = async (address, page) => {
	await _wait_for_selector_and_type(page, 'input', address, {desc: 'address input'});
}

const _click_address_option = async (option, page) => {
	const choiceSelector = _child_choice_selector("div[data-test=list-container] > div", option);
	await _wait_for_selector_and_click(page, choiceSelector, {desc: 'address choice'});
}

const _enter_and_click_address = async (address, page) => {
	await _enter_address(address.address, page);
	await _click_address_option(address.option, page);
}

const _search_address = async (address, page) => {
	await _enter_address(address, page);
	
	const results = await page.evaluate(() => {
		const results = Array.from(document.querySelectorAll("div[data-test=list-container] > div"));
		return results.map(div => div.children[1].innerText)
					  .filter(txt => !txt.match(/Allow location access/))
					  .map((item,idx) => (idx+1) + ". " + item)

	});

	return results;
}

const _order_trip = async (travelChoice, paymentProfileChoice, page) => {
	const TRAVEL_CHOICE_SELECTOR = _child_choice_selector("div[data-test=tiers-container] > div[data-test=vehicle-view-container]", travelChoice) + " > div";
	const PAYMENT_PROFILE_MENU_SELECTOR = "div[data-test=request-trip-button-container] > div";
	const PAYMENT_PROFILE_CHOICE_SELECTOR = _child_choice_selector("div[data-test=list-container] > span > div", paymentProfileChoice);
	const REQUEST_BUTTON_SELECTOR = "div[data-test=request-trip-button-container] > button";

	// select ride option
	await _wait_for_selector_and_click(page, TRAVEL_CHOICE_SELECTOR, {desc: "vehicle choice"});

	// select payment profile
	await _wait_for_selector_and_click(page, PAYMENT_PROFILE_MENU_SELECTOR, {desc: "profile menu", delay: 2000});
	await _wait_for_selector_and_click(page, PAYMENT_PROFILE_CHOICE_SELECTOR, {desc: "profile choice"});

	// submit order
	await _wait_for_selector_and_click(page, REQUEST_BUTTON_SELECTOR, {desc: "request button"});

	// handle uber pool selection
	console.log("checking for pool");
	const isPool = await page.evaluate(() => !!document.querySelector("div[data-test=background]") && document.querySelector("div[data-test=background] + div + div > div > div > div").innerText.indexOf("How many seats do you need?") > -1);
	console.log("isPool = " + isPool);
	if (isPool) {
		console.log("uber pool selection detected. asking for only 1 seat...")
		await _click(page, "div[data-test=background] + div + div > div > div:nth-child(2)");			
	}

	// handle surge pricing
	console.log("checking for surge");
	const isSurge = await page.evaluate(() => !!document.querySelector("div[data-test=question-description]") && document.querySelector("div[data-test=question-description]").previousSibling.innerText.indexOf("Fares are slightly higher due to increased demand.") > -1);
	console.log("isSurge = " + isSurge);
	if (isSurge) {
		console.log("surge pricing detected. agreeing to higher fares.");
		await _click(page, "div[data-test=question-description] + div > div + div > button");
	}

	await page.waitForFunction(() => !!document.querySelector("div[data-test=top-section-container]") && document.querySelector("div[data-test=top-section-container]").innerText.indexOf("Your driver") > -1);
	const ride_details = await page.evaluate(() => document.querySelector("div[data-test=bottom-section-container] > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1)").innerText);
	await _click(page, "div[data-test=bottom-section-container] > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1)");
	const phone_details = await page.evaluate(() => document.querySelector("div[data-test=x-mark] + div").firstChild.childNodes[1].innerText);
	const phone_number = "+" + phone_details.split("+")[1];
	return [ride_details, phone_number];
}

const _search_rates = async (page) => {
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

const _search_payment_profiles = async (page) => {
	const PAYMENT_OPTION_SELECTOR = "div[data-test=request-trip-button-container] > div"

	try {
		await _wait_for_selector(page, PAYMENT_OPTION_SELECTOR, 5000, 10000);
	} catch (e) {
		console.log("Timed out waiting for payment options. Probably something wrong with the route");
		return [];
	}
    await page.click(PAYMENT_OPTION_SELECTOR)

	const results = await page.evaluate(() => {
		const RESULTS_SELECTOR = "div[data-test=list-container] > span > div"

		const results = Array.from(document.querySelectorAll(RESULTS_SELECTOR));
		results.splice(-1, 1);
		return results.map((item,idx) => (idx+1) + ". " + item.innerText)
	});
	return results;
}

const _execute_in_page = async (fnc, cookies, launchArgs = {}) => {
	console.log(`\n\nLaunching browser...`);
	const overriddenLaunchArgs = Object.assign({}, defaultLaunchArgs, launchArgs);

	console.log(`Headless mode: ${overriddenLaunchArgs.headless}`);
	const browser = await puppeteer.launch(overriddenLaunchArgs);
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

const _execute_in_page_past_auth = async (fnc, cookies, launchArgs = {}) => {
	return await _execute_in_page(async (page) => {
		const uri = uri_utils.base_uri(await page.url());

		if (uri !== "https://m.uber.com") {
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
	}, cookies, launchArgs);
}

const login_with_totp = async (credentials, launchArgs) => {
	return await _execute_in_page(async (page) => {
		const uri = uri_utils.base_uri(await page.url());
		if (uri === "https://auth.uber.com") {
			console.error("[AUTH] Not logged in. Logging in.")
			const loggedIn = await _login(page, credentials);
			console.log("[AUTH] Logged in succeeded: " + loggedIn)
			return loggedIn ? JSON.stringify(await page.cookies()) : null;
		} else if (uri === "https://m.uber.com") {
			console.log("[AUTH] Logged in.");
			return JSON.stringify(await page.cookies());
		} else {
			console.error("Unrecognized login URI: " + uri);
			return null;
		}
	}, '[]', launchArgs);
}

const lookup_address = async (queryAddress, cookies, launchArgs) => {
	return await _execute_in_page_past_auth(async (page) => {
		return await _search_address(queryAddress, page);
	}, cookies, launchArgs);
}

const lookup_rates = async (src, dest, cookies, launchArgs) => {
	return await _execute_in_page_past_auth(async (page) => {
		await _enter_and_click_address(src, page);
		await _enter_and_click_address(dest, page);
		return await _search_rates(page);
	}, cookies, launchArgs);
}

const book_trip = async (src, dest, travel_option, payment_profile, cookies, launchArgs) => {
	return await _execute_in_page_past_auth(async (page) => {
		await _enter_and_click_address(src, page);
		await _enter_and_click_address(dest, page);
		return await _order_trip(travel_option, payment_profile, page);
	}, cookies, launchArgs);
}

const cancel_trip = async (cookies, launchArgs) => {
	return await _execute_in_page_past_auth(async (page) => {
		try {
			await page.waitForSelector("div[data-test=list-container] + div > div > button");
			await _click_and_wait_ms(page, "div[data-test=list-container] + div > div > button", 1000);
			await page.waitForSelector("div[data-test=question-description] + div > div + div > button");
			await _click_and_wait_ms(page, "div[data-test=question-description] + div > div + div > button", 1000);
		} catch (error) {
			console.log("error cancelling trip: " + error);
			return false;	
		}
		return true;
	}, cookies, launchArgs);
}

const lookup_payment_profiles = async (src, dest, cookies, launchArgs) => {
	return await _execute_in_page_past_auth(async (page) => {
		await _enter_and_click_address(src, page);
		await _enter_and_click_address(dest, page);
		return await _search_payment_profiles(page);
	}, cookies, launchArgs);
}

/* External API */
exports.login_with_totp = login_with_totp;
exports.lookup_address = lookup_address;
exports.lookup_rates = lookup_rates;
exports.lookup_payment_profiles = lookup_payment_profiles;
exports.book_trip = book_trip;
exports.cancel_trip = cancel_trip;
