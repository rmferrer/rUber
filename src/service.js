const express = require('express');
const bodyParser = require('body-parser');
const smsController = require('./sms-controller');
const redis = require('./redis').redis;
const twilio = require('./twilio');

/* Express */
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.set('port', (process.env.PORT || 5000));

app.post('/sms', async (req, res) => {
  const responseText = await smsController.smsHandler(req.body, redis, twilio);
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(responseText);
});

exports.service = app;
