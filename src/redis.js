/* Module Imports */
const redis = require('redis');
const bluebird = require('bluebird');

/* Redis */
bluebird.promisifyAll(redis);
const redisClient = redis.createClient(process.env.REDIS_URL);

redisClient.on('connect', function() {
    console.log('Redis client connected');
});

redisClient.on('error', function (err) {
    console.log('Something went wrong ' + err);
});

exports.redis = redisClient;
