const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create({
    instance: { port: 27117, dbName: 'betnua' },
  });
  console.log('MEM_MONGO_URI=' + mongod.getUri('betnua'));
  console.log('MEM_MONGO_READY');

  const shutdown = async () => {
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
})();
