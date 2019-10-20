const http = require('http');
const service = require('./service').service;

/* Start server */
http.createServer(service).listen(service.get('port'), () => {
  console.log('Express server listening on port ' + service.get('port'));
});
