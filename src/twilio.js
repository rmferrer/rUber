const twilio = require('twilio');

exports.client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);;
exports.messagingResponse = twilio.twiml.MessagingResponse;
