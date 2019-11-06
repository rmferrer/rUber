const prompt = require('prompt');

const uber_controller = require("../src/uber-controller");

prompt.start();

var schema = {
  properties: {
    email: {
      description: "Enter your Uber email",
      required: true
    },
    password: {
      description: "Enter your Uber password (will be hidden)",
      hidden: true, 
      required: true
    },
    totp: {
      description: "Enter your 2 factor authentication code (leave blank if you don't have 2FA enabled",
      pattern: /^[0-9]{6}$/,
      required: false
    }
  }
};

prompt.get(schema, function (err, result) {
    if (err) { return onErr(err); }
    try {
        const resultPromise = uber_controller.login_with_totp(result.email, result.password, result.totp);
        resultPromise.then(function(result) {
          console.log("Your Uber cookies are:\n\n>>>>>>>>>>>>>\n" + result + "\n<<<<<<<<<<<<<\n"); // "Stuff worked!"
        }, function(err) {
          console.log(err); // Error: "It broke"
        });
    } catch(e) {
        console.log(e);
    }
});

function onErr(err) {
    console.log(err);
    return 1;
}
