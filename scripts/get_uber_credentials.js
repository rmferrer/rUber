const prompt = require('prompt');

const schema = {
  properties: {
    countryCode: {
      description: "Enter your Uber phone number country code",
      required: true
    },
    phoneNumber: {
      description: "Enter your Uber phone number",
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

const get_uber_credentials = async () => {
  return new Promise(function(resolve, reject) {
    prompt.start();
    prompt.get(schema, function (err, result) {
      if (err !== null) reject(err);  
      else resolve(result);
    });
  });
}

exports.get_uber_credentials = get_uber_credentials;