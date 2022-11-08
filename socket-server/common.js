/**
 * 统一返回参数
 */
function getMsg(type,msg,status=200,data=null){
	return {"type":type,"msg":msg,"status":status,"data":data}
	
}
/**
 * 解析url参数
 * @param {Object} url
 * @param {Object} queryName
 */
function getParams(url,queryName){
	let query = decodeURI(url.split('?')[1]);
	let vars = query.split("&");
	for (var i = 0; i < vars.length; i++) {
	  var pair = vars[i].split("=");
	  if (pair[0] === queryName) {
	    return pair[1];
	  }
	}
	return null;
}


module.exports = {
	getMsg,
	getParams
}