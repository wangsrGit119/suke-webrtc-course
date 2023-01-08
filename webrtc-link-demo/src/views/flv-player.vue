<template>
	<div class="container">
		<el-row  >
			<video id="videoElement" style="object-fit: fill;" controls width="700px" height="450px"></video>
		</el-row>
		<el-row style="display: flex;flex-direction: row;justify-content: center;">
			<el-input style="width: 300px;" v-model="flv"></el-input>
			<el-button type="primary" size="mini" @click="play()">播放</el-button>
		</el-row>
	</div>
</template>

<script>
function getParams(queryName){
	let url = window.location.href
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
import flvjs from "flv.js";
export default {
  name: 'flv-player',
  components: {
    
  },
  data(){
	  return{
		  flv:'',
	  }
  },
  created() {
	  let flv = getParams('flv')
	  if(flv){
		  this.flv = decodeURI(flv)
	  }
  },
  methods:{
	   play(){
		   if(!this.flv){
			   this.$message.warning("播放地址不能为空")
			   return
		   }
		   var videoElement = document.getElementById('videoElement');
		   if(this.flvPlayer){
		   	this.flvPlayer.destroy();
		   }
		  
		   if (flvjs.isSupported() && videoElement) {
		       this.flvPlayer = flvjs.createPlayer({
		           type: 'flv',
		           isLive: true,
		           url: this.flv
		       });
		       this.flvPlayer.attachMediaElement(videoElement);
		       this.flvPlayer.on('error',function(err){
		           console.log(err)
		       });
		       this.flvPlayer.load();
		       this.flvPlayer.play();
		   }
	   }
	  
  }
}
</script>

<style scoped>
	.container{
		padding-top: 20px;
		height: 90vh;
	}
	
</style>