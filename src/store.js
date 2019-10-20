const models = require('./models');
		
const redisKeys = {
	status: "status",
	sourceQuery: "source_query",
	sourceOption: "source_option",
	destQuery: "dest_query",
	destOption: "dest_option",
	cookies: "cookies",
	tempName: "temp_name",
	tempAddress: "temp_address",
	addressBook: "address_book"
}

const get_session = async (key, redis) => {
	const session = await redis.hgetallAsync(key);
	
	if (!session) {
		console.log("empty session, creating new one");
		const newSession = {"status": models.statusCodes.loggedOut};
		console.log(newSession); 
		redis.hmset(key, newSession);
		return newSession;
	}
	return session;
}


const get_session_status = async (key, redis) => {
	const session = await get_session(key, redis);
	return session[redisKeys.status];
}

const set_session_status = async (key, status, redis) => {
	await redis.hmsetAsync(key, redisKeys.status, status);
}

const set_session_source_address = async (key, sourceQuery, redis) => {
	await redis.hmsetAsync(key, redisKeys.sourceQuery, sourceQuery);
}
const set_session_source_option = async (key, sourceOption, redis) => {
	await redis.hmsetAsync(key, redisKeys.sourceOption, sourceOption);
}

const set_session_dest_address = async (key, destQuery, redis) => {
	await redis.hmsetAsync(key, redisKeys.destQuery, destQuery);
}
const set_session_dest_option = async (key, destOption, redis) => {
	await redis.hmsetAsync(key, redisKeys.destOption, destOption);
}

const get_session_source_address = async (key, redis) => {
	const session = await get_session(key, redis);
	return session[redisKeys.sourceQuery];
}

const get_session_source_option = async (key, redis) => {
	const session = await get_session(key, redis);
	return session[redisKeys.sourceOption];
}

const get_session_dest_address = async (key, redis) => {
	const session = await get_session(key, redis);
	return session[redisKeys.destQuery];
}

const get_session_dest_option = async (key, redis) => {
	const session = await get_session(key, redis);
	return session[redisKeys.destOption];
}

const nuke_session = async(key, redis) => {
	await redis.delAsync(key);
}

const logout_session = async(key, redis) => {
	await redis.hmsetAsync(key, redisKeys.status, models.statusCodes.loggedOut);
}

const get_session_cookies = async(key, redis) => {
	const session = await get_session(key, redis);
	return session[redisKeys.cookies];
}
const set_session_cookies = async (key, cookies, redis) => {
	await redis.hmsetAsync(key, redisKeys.cookies, cookies);
}

const save_temp_address_name = async (name, key, redis) => {
	await redis.hmsetAsync(key, redisKeys.tempName, name);
}

const save_temp_address_address = async (address, key, redis) => {
	await redis.hmsetAsync(key, redisKeys.tempAddress, address);
}

const get_temp_address_name = async (key, redis) => {
	const session = await get_session(key, redis);
	return session[redisKeys.tempName];
}

const get_temp_address_address = async (key, redis) => {
	const session = await get_session(key, redis);
	return session[redisKeys.tempAddress];
}

const get_address_book = async(key, redis) => {
	const session = await get_session(key, redis);
	let addressBookRaw = session[redisKeys.addressBook];
	if (!addressBookRaw) {
		addressBookRaw = "{}";
	}
	return JSON.parse(addressBookRaw);
}

const save_address = async(key, name, address, choice, redis) => {
	const addressBook = await get_address_book(key, redis);
	addressBook[name] = [address, choice];
	await redis.hmsetAsync(key, redisKeys.addressBook, JSON.stringify(addressBook));	
}

const resolve_address = async(key, address, redis) => {
	const addressBook = await get_address_book(key, redis);
	const resolvedAddress = addressBook[address];
	return resolvedAddress;
}

exports.get_session_status = get_session_status;
exports.set_session_status = set_session_status;
exports.set_session_source_address = set_session_source_address;
exports.set_session_source_option = set_session_source_option;
exports.set_session_dest_address = set_session_dest_address;
exports.set_session_dest_option = set_session_dest_option;
exports.get_session_source_address = get_session_source_address;
exports.get_session_source_option = get_session_source_option;
exports.get_session_dest_address = get_session_dest_address;
exports.get_session_dest_option = get_session_dest_option;
exports.get_session = get_session;
exports.nuke_session = nuke_session;
exports.logout_session = logout_session;
exports.get_session_cookies = get_session_cookies;
exports.set_session_cookies = set_session_cookies;
exports.save_temp_address_name = save_temp_address_name;
exports.save_temp_address_address = save_temp_address_address;
exports.get_temp_address_name = get_temp_address_name;
exports.get_temp_address_address = get_temp_address_address;
exports.save_address = save_address;
exports.resolve_address = resolve_address;
exports.get_address_book = get_address_book;
