/* Module Imports */
const uberController = require('./uber-controller');
const store = require('./store');
const models = require('./models');

const _loginHandler = async (sessionKey, redis) => {
  await store.set_session_status(sessionKey, models.statusCodes.totp, redis);
  return ["Enter TOTP for auth (empty if you don't have 2FA):"];
}

const _totpHandler = async (credentials, sessionKey, redis, launchArgs) => {
  const cookies = await uberController.login_with_totp(credentials, launchArgs);
  
  if (cookies) {
    await store.set_session_cookies(sessionKey, cookies, redis);
    await store.set_session_status(sessionKey, models.statusCodes.mainMenu, redis);
  }
  
  return ["Logged in: " + (cookies != null) + (cookies != null ? "\nMain menu:\nride/r\nsettings/s" : "Try entering TOTP again.")];
}

const _newRideHandler = async (sessionKey, redis) => {
  await store.set_session_status(sessionKey, models.statusCodes.inputSource, redis);
  return ["Where from?"];
}

const _inputSourceHandler = async (input, sessionKey, redis, cookies, launchArgs) => {
  const resolvedAddress = await store.resolve_address(sessionKey, input, redis);
  if (resolvedAddress) {
    await store.set_session_status(sessionKey, models.statusCodes.inputDest, redis);
    await store.set_session_source_address(sessionKey, resolvedAddress[0], redis);
    await store.set_session_source_option(sessionKey, resolvedAddress[1], redis);
    return ["Where to?"];
  }
  const addresses = await uberController.lookup_address(input, cookies, launchArgs);
  const response = ["0. Reenter address."].concat(addresses).concat(["Which option?"]).join('\n\n');
  await store.set_session_status(sessionKey, models.statusCodes.chooseSource, redis);
  await store.set_session_source_address(sessionKey, input, redis);
  return [response];
}

const _chooseSourceHandler = async (input, sessionKey, redis) => {
  const choice = Number(input);
  
  if (choice === 0) {
    await store.set_session_status(sessionKey, models.statusCodes.inputSource, redis);
    return ["Where from?"];
  }

  await store.set_session_source_option(sessionKey, choice, redis);
  await store.set_session_status(sessionKey, models.statusCodes.inputDest, redis);

  return ["Where to?"];
}

const _inputDestHandler = async (input, sessionKey, redis, cookies, launchArgs) => {
  const resolvedAddress = await store.resolve_address(sessionKey, input, redis);
  if (resolvedAddress) {
    await store.set_session_status(sessionKey, models.statusCodes.chooseTravelOption, redis);
    await store.set_session_dest_address(sessionKey, resolvedAddress[0], redis);
    await store.set_session_dest_option(sessionKey, resolvedAddress[1], redis);
  
    const srcAddress = await store.get_session_source_address(sessionKey, redis);
    const srcOption = await store.get_session_source_option(sessionKey, redis);
    const src = {
      address: srcAddress,
      option: srcOption
    }
    const dst = {
      address: resolvedAddress[0],
      option: resolvedAddress[1]
    }
    const rates = await uberController.lookup_rates(src, dst, cookies, launchArgs);
    return [rates.concat(["Which option?"]).join('\n\n')];
  }
  const addresses = await uberController.lookup_address(input, cookies, launchArgs);
  response = ["0. Reenter address."].concat(addresses).concat(["Which option?"]).join('\n\n');
  await store.set_session_status(sessionKey, models.statusCodes.chooseDest, redis);
  await store.set_session_dest_address(sessionKey, input, redis);
  return [response];
}

const _chooseDestHandler = async (input, sessionKey, redis, cookies, launchArgs) => {
  const choice = Number(input);
  
  if (choice === 0) {
    await store.set_session_status(sessionKey, models.statusCodes.inputDest, redis);
    return ["Where to?"];
  }

  await store.set_session_dest_option(sessionKey, choice, redis);
  await store.set_session_status(sessionKey, models.statusCodes.chooseTravelOption, redis);

  const srcAddress = await store.get_session_source_address(sessionKey, redis);
  const srcOption = await store.get_session_source_option(sessionKey, redis);
  const destAddress = await store.get_session_dest_address(sessionKey, redis);
  const destOption = await store.get_session_dest_option(sessionKey, redis);
  const src = {
    address: srcAddress,
    option: srcOption
  }
  const dst = {
    address: destAddress,
    option: destOption
  }
  const rates = await uberController.lookup_rates(src, dst, cookies, launchArgs);
  return [rates.concat(["Which option?"]).join('\n\n')];
}

const _chooseTravelOptionHandler = async (input, sessionKey, redis, cookies, launchArgs) => {
  const choice = Number(input);
  
  await store.set_session_travel_option(sessionKey, choice, redis);
  await store.set_session_status(sessionKey, models.statusCodes.paymentMethodChoice, redis);

  const srcAddress = await store.get_session_source_address(sessionKey, redis);
  const srcOption = await store.get_session_source_option(sessionKey, redis);
  const destAddress = await store.get_session_dest_address(sessionKey, redis);
  const destOption = await store.get_session_dest_option(sessionKey, redis);
  const src = {
    address: srcAddress,
    option: srcOption
  }
  const dst = {
    address: destAddress,
    option: destOption
  }
  const paymentProfiles = await uberController.lookup_payment_profiles(src, dst, cookies, launchArgs);
  return [paymentProfiles.concat(["Which payment profile?"]).join('\n\n')];
}

const _choosePaymentProfileHandler = async (input, sessionKey, redis, cookies, launchArgs) => {
  const paymentProfileChoice = Number(input);
  
  const srcAddress = await store.get_session_source_address(sessionKey, redis);
  const srcOption = await store.get_session_source_option(sessionKey, redis);
  const destAddress = await store.get_session_dest_address(sessionKey, redis);
  const destOption = await store.get_session_dest_option(sessionKey, redis);
  const src = {
    address: srcAddress,
    option: srcOption
  }
  const dst = {
    address: destAddress,
    option: destOption
  }  
  const travelChoice = await store.get_session_travel_option(sessionKey, redis);
  const tripDetails = await uberController.book_trip(src, dst, travelChoice, paymentProfileChoice, cookies, launchArgs);

  await store.set_session_status(sessionKey, models.statusCodes.rideInProgress, redis);

  return tripDetails;
}

const _logoutHandler = async (sessionKey, redis) => {
  await store.logout_session(sessionKey, redis);
  return ["Logged out."];
}

const _nukeHandler = async (sessionKey, redis) => {
  await store.nuke_session(sessionKey, redis);
  return ["Nuked session! Booom shakalaka"];
}

const _mainMenuSpecialCommandHandler = async (sessionKey, redis) => {
  await store.set_session_status(sessionKey, models.statusCodes.mainMenu, redis);
  return ["Main menu:\nride/r\nsettings/s"];
}

const _mainMenuHandler = async (input, sessionKey, redis) => {
  if (input === "r" || input === "ride") {
    return await _newRideHandler(sessionKey, redis);
  } 
  if (input === "s" || input === "settings") {
    await store.set_session_status(sessionKey, models.statusCodes.settings, redis);
    return ["Settings menu: \nsave address/s\nshow address book/a"];
  }
  return ["unrecognized menu command. try ride/r or settings/s"];
}

const _settingsHandler = async (input, sessionKey, redis) => {
  if (input === "s" || input === "save address") {
    await store.set_session_status(sessionKey, models.statusCodes.saveName, redis);
    return ["enter name to save address by: "];
  }
  if (input === "a" || input === "show address book") {
    const addressBook = await store.get_address_book(sessionKey, redis);
    let strAddresssBook = "";
    for (var key in addressBook) {
      if (addressBook.hasOwnProperty(key)) {
        strAddresssBook+= key + " -> " + addressBook[key] +"\n";
      }
    }
    return [strAddresssBook];
  }
  return ["unrecognized menu command.\ntry:\nsave address/s\nshow address book/a"];
}

const _saveNameHandler = async (input, sessionKey, redis) => {
  await store.save_temp_address_name(input, sessionKey, redis);
  await store.set_session_status(sessionKey, models.statusCodes.saveAddress, redis);
  return ["enter address: "];
}

const _saveAddressHandler = async (input, sessionKey, redis, cookies, launchArgs) => {
  const addresses = await uberController.lookup_address(input, cookies, launchArgs);
  response = ["0. Reenter address."].concat(addresses).concat(["Which option?"]).join('\n\n');
  await store.save_temp_address_address(input, sessionKey, redis);
  await store.set_session_status(sessionKey, models.statusCodes.saveAddressOption, redis);
  return [response];
}

const _rideInProgressOptionHandler = async (input, sessionKey, redis, cookies, launchArgs) => {
  switch (input) {
    case "cancel":
      const success = await uberController.cancel_trip(cookies, launchArgs);
      if (success) {
        await store.set_session_status(sessionKey, models.statusCodes.mainMenu, redis);
        return ["trip cancelled!"]; 
      } else {
        return ["error cancelling trip"]; 
      }
    default:
      return ["command not recognized. try again...\ncancel"];
  }
}

const _saveAddressOptionHandler = async (input, sessionKey, redis) => {
  const choice = Number(input);
  
  if (choice === 0) {
    await store.set_session_status(sessionKey, models.statusCodes.saveAddress, redis);
    return ["enter address: "];
  }

  const name = await store.get_temp_address_name(sessionKey, redis);
  const address = await store.get_temp_address_address(sessionKey, redis);
  
  await store.save_address(sessionKey, name, address, choice, redis);
  await store.set_session_status(sessionKey, models.statusCodes.mainMenu, redis);

  return ["address saved! back to main menu"];
}

const _inputRouter = async (input, sessionKey, redis) => {
  const launchArgs = {
    headless: process.env.HEADLESS,
  }

  /* Handle logged out special commands first */
  if (input === "radio-check") {
    return ["Radio check! One two. Check check. One two. Check!"];
  }

  const sessionStatus = await store.get_session_status(sessionKey, redis);
  const sessionCookies = await store.get_session_cookies(sessionKey, redis);

  if(!sessionCookies) {
    if (sessionStatus === models.statusCodes.loggedOut) {
      return await _loginHandler(sessionKey, redis, launchArgs);
    }
    if (sessionStatus === models.statusCodes.totp) {
      const credentials = {
        countryCode: process.env.UBER_COUNTRY_CODE,
        phoneNumber: process.env.UBER_PHONE_NUMBER,
        password: process.env.UBER_PASSWORD,
        totp: input
      }
      return await _totpHandler(credentials, sessionKey, redis, launchArgs);
    }
  }

  /* Handle logged in special commands first */
  if (input === "menu") {
    return await _mainMenuSpecialCommandHandler(sessionKey, redis, launchArgs);
  }
  /* Handle special commands first */
  if (input === "u") {
    return await _newRideHandler(sessionKey, redis, launchArgs);
  } 
  if (input === "logout") {
    return await _logoutHandler(sessionKey, redis, launchArgs);
  }
  if (input === "nuke") {
    return await _nukeHandler(sessionKey, redis, launchArgs);
  }

  switch(sessionStatus) {
    case models.statusCodes.loggedOut: 
      throw new Error("Cookies nonempty and status code is loggedOut");
    case models.statusCodes.totp: 
      throw new Error("Cookies nonempty and status code is totp");
    case models.statusCodes.mainMenu:
      return await _mainMenuHandler(input, sessionKey, redis, launchArgs);
    case models.statusCodes.settings:
      return await _settingsHandler(input, sessionKey, redis, launchArgs);
    case models.statusCodes.saveName:
      return await _saveNameHandler(input, sessionKey, redis, launchArgs);
    case models.statusCodes.saveAddress:
      return await _saveAddressHandler(input, sessionKey, redis, sessionCookies, launchArgs);
    case models.statusCodes.saveAddressOption:
      return await _saveAddressOptionHandler(input, sessionKey, redis, launchArgs);
    case models.statusCodes.inputSource:
      return await _inputSourceHandler(input, sessionKey, redis, sessionCookies, launchArgs);
    case models.statusCodes.chooseSource:
      return await _chooseSourceHandler(input, sessionKey, redis, launchArgs);
    case models.statusCodes.inputDest:
      return await _inputDestHandler(input, sessionKey, redis, sessionCookies, launchArgs);
    case models.statusCodes.chooseDest:
      return await _chooseDestHandler(input, sessionKey, redis, sessionCookies, launchArgs);
    case models.statusCodes.chooseTravelOption:
      return await _chooseTravelOptionHandler(input, sessionKey, redis, sessionCookies, launchArgs);
    case models.statusCodes.paymentMethodChoice:
      return await _choosePaymentProfileHandler(input, sessionKey, redis, sessionCookies, launchArgs);
    case models.statusCodes.rideInProgress:
      return await _rideInProgressOptionHandler(input, sessionKey, redis, sessionCookies, launchArgs);
    default:
      return ["don't have a handler for status : " + sessionStatus]; 
  }
}

const smsHandler = async (request, redis, twilio) => {
  const input = request.Body.toLowerCase();
  const from = request.From.toLowerCase();
  const to = request.To.toLowerCase();

  console.log("\n\n[SMS Handler] NEW SMS");
  console.log("[SMS Handler] From: \n" + from);
  console.log("[SMS Handler] Input: \n" + input);

  _inputRouter(input, from, redis).then((messages) => {
    console.log("Async handler finished. Sending: " + messages.join("\n"));
    console.log("From: " + from);
    console.log("To: " + to);
    messages.forEach((message) => {
      twilio.client.messages
      .create({
         body: message,
         from: to,
         to: from
       })
      .then(message => console.log(message.sid));
    });
  }); 

  return new twilio.messagingResponse().toString();
}

/* External API */
exports.smsHandler = smsHandler;
