const uber_controller = require("../src/uber-controller");
const credentials = require("get_uber_credentials");

const getUberCookies = async () => {
  const uberCredentials = await credentials.get_uber_credentials();
  try {
    return await uber_controller.login_with_totp(uberCredentials);
  } catch(e) {
    console.log(e);
  }          
}

function printUberCredentials () {
  getUberCookies().then(function(result) {
    console.log("Your Uber cookies are:\n\n>>>>>>>>>>>>>\n" + result + "\n<<<<<<<<<<<<<\n"); // "Stuff worked!"
  }, function(err) {
    console.log(err); // Error: "It broke"
  });
}
printUberCredentials();