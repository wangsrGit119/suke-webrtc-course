//redis
var redis = require('redis')



var redisClient = redis.createClient({
	    host: '127.0.0.1',
	    port: 6379,
	    // password: 'suke001'
})

redisClient.on("connect", function () {
  console.log("redis 连接成功");
});
redisClient.on('error', function (err) {
  console.log('redis 连接异常 ' ,err);
});
redisClient.on('reconnecting', (stats) => {
  console.log('redis重连', stats);
});

async function hSet(key,hashkey,hashval){
	if (typeof hashval === 'object') {
	    hashval = JSON.stringify(hashval)
	  }
	await redisClient.hmset(key,hashkey, hashval)
}

async function hGetAll(key){
	const promise = new Promise((resolve,reject) => {
		redisClient.hgetall(key,function(err,val){
			if(err){
				reject(err)
				return
			}
			if(val == null){
				resolve(null)
				return
			}
			resolve(val)
		})
	})
	return promise
}

async function hDel(key,hashkey){
	await redisClient.hdel(key,hashkey)
}

// async function 

module.exports = {
	hSet,
	hGetAll,
	hDel
}