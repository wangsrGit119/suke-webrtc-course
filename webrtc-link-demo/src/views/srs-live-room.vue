<template>
  <el-row class="container">
  	<el-col :span="18" >
  		<div style="width: 90%;height: 90%;">
			<SrsRtcPull scanvideodomId="srsRtcPullLiveRoom" ref="srsRtcPullLiveRoom" style="width: 90%;height: 90%;"></SrsRtcPull>
		</div>
  	</el-col>
	<el-col :span="6" >
		<el-button type="danger"  style="width: 100px;margin-top: 100px;" size="mini" @click="applyMic()">申请连麦</el-button>
		<video id="videoElement" width="300px" height="200px" autoplay muted></video>
	</el-col>
  </el-row>
</template>

<script>
navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia;
var PeerConnection = window.RTCPeerConnection ||
    window.mozRTCPeerConnection ||
    window.webkitRTCPeerConnection;
import axios from "axios"

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
function handleError(error) {
    console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
}
import SrsRtcPull from '@/components/SrsRtcPull'
const { io } = require("socket.io-client");
export default {
  name: 'srs-live-room',
  components:{
	  SrsRtcPull
  },
  data() {
  	return{
		streamId:'remote'+Date.now(),
	}
  },
  created() {
  	this.liveRoomId = getParams('liveroomid')
	if(getParams("userId")){
		this.init(getParams("userId"),getParams("roomId"),getParams('userId'))
	}
	
  },
  mounted() {
  	this.initRoom()
  },
  methods:{
	  initRoom(){
		  console.log(this.$refs)
		  if(this.liveRoomId && this.$refs['srsRtcPullLiveRoom']){
		  	this.$refs['srsRtcPullLiveRoom'].getPullSdp(this.liveRoomId)
		  }
	  },
	  applyMic(){
		  let tid =  getParams('tid')//主播ID
		  let params ={	"userId": getParams('userId'),"targetUid":tid,streamId:this.streamId}
		  this.linkSocket.emit('applyMic',params)
	  },
	  init(userId,roomId,nickname){
	  	const that = this
	  	this.userInfo = {
	  		userId:userId,
	  		roomId:roomId,
	  		nickname:nickname
	  	}
	  	this.linkSocket = io(this.$serverSocketUrl, {
	  		reconnectionDelayMax: 10000,
	  		transports: ["websocket"],
	  		query: {
	  		  "userId": userId,
	  		  "roomId": roomId,
	  		  "nickname":nickname
	  		}
	  	});
	  	this.linkSocket.on("connect",(e)=>{
	  		console.log("server init connect success",that.linkSocket)
	  	})
	  	this.linkSocket.on("roomUserList",(e)=>{
	  		console.log("roomUserList",e)
	  		that.roomUserList = e					
	  	})
	  	this.linkSocket.on("msg",async (e)=>{
	  		console.log("msg",e)
	  		if(e['type'] === 'acceptApplyMic'){
	  			that.play()
	  		}
	  	})
	  	this.linkSocket.on("error",(e)=>{
	  		console.log("error",e)
	  	})
	  },
	  async getLocalUserMedia(audioId,videoId){
	  	const constraints = {
	  	    audio: {deviceId: audioId ? {exact: audioId} : undefined},
	  	    video: {
	  	        deviceId: videoId ? {exact: videoId} : undefined,
	  	        width:1920,
	  	        height:1080,
	  	        frameRate: { ideal: 15, max: 24 }
	  	    }
	  	};
	  	if (window.stream) {
	  	    window.stream.getTracks().forEach(track => {
	  	        track.stop();
	  	    });
	  	}
	      return await navigator.mediaDevices.getUserMedia(constraints).catch(handleError)
	  },
	  async getPushSdp(streamId,stream){
			const that = this
			that.pc = await new PeerConnection(null);
			that.pc.addTransceiver("audio", {direction: "sendonly"});
			that.pc.addTransceiver("video", {direction: "sendonly"});
			//send
			stream.getTracks().forEach(function (track) {
				that.pc.addTrack(track);
			});
			let offer = await that.pc.createOffer();
			await that.pc.setLocalDescription(offer)
			let data = {
			  "api": this.$srsServerAPIURL+"rtc/v1/publish/",
			  "streamurl": this.$srsServerRTCURL+streamId,
			  "sdp": offer.sdp
			}
			axios.post(this.$srsServerAPIURL+'rtc/v1/publish/',data)
			.then( async res => {
				res = res.data
				console.log(res)
				if(res.code === 0){
					await that.pc.setRemoteDescription(new RTCSessionDescription({type: 'answer', sdp: res.sdp}))
					// that.$refs['srsRtcPullLiveRoomPreview'].getPullSdp(streamId)
				}else{
					this.$message.error("推流失败请重试")
				}
			}).catch(err => {
				console.error("SRS 推流异常",err)
				this.$message.error("推流异常，请检查流媒体服务器")
			})
	  },
	  async play(){
		   if(!this.localstream){
			   this.localstream = await this.getLocalUserMedia(null,null)
		   }
		   await this.setDomVideoStream('videoElement',this.localstream)
		   await this.getPushSdp(this.streamId,this.localstream)
	  },
	  async setDomVideoStream(domId,newStream){
			let video = document.getElementById(domId)
			let stream = video.srcObject
			if(stream){
				stream.getTracks().forEach(e => e.stop())
			}
			video.srcObject =newStream
			video.muted = true
			video.autoplay=true
	  },
	  
  }
  
  
}
</script>

<style scoped>
.container{
	border: 1px skyblue solid;
	height: 98vh;
}

</style>
