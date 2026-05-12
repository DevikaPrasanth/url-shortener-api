const redis = require('redis');

const redisUrl = process.env.REDIS_URL;

const redisClient = redis.createClient({
  url: redisUrl,
  socket: redisUrl?.startsWith('rediss://')
    ? {
        tls: true,
        rejectUnauthorized: false
      }
    : undefined
});

redisClient.on('error', (err) => {
  console.log('Redis Error:', err);
});

(async () => {
  await redisClient.connect();
  console.log('Redis connected');
})();

module.exports = redisClient;
