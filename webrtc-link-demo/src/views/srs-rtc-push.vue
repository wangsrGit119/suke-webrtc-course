<template>
	<div class="container">
		<el-row >
			<el-col :span="12" style="">
				<video id="videoElement" style="object-fit: fill;" controls width="700px" height="450px"></video>
				<el-row style="display: flex;flex-direction: column;justify-content: center;align-items: center;height: auto">
					<el-tag style="width: 600px;">当前流ID {{streamId}}</el-tag>
					<el-tag style="width: 600px;" type="warning" v-if="scanUrlFlv">FLV地址：{{scanUrlFlv}}</el-tag>
					<el-tag style="width: 600px;" type="danger" v-if="scanUrlHls">HLS地址：{{scanUrlHls}}</el-tag>
					<div>
						<el-button type="success" style="width: 100px;" size="mini" @click="play()">推流</el-button>
						<el-button type="danger" v-if="!audioStatus" style="width: 100px;" size="mini" @click="audioControl(true)">打开麦克风</el-button>
						<el-button type="primary" v-if="audioStatus" style="width: 100px;" size="mini" @click="audioControl(false)">关闭麦克风</el-button>
						<el-button type="danger" v-if="!videoStatus" style="width: 100px;" size="mini" @click="videoControl(true)">打开摄像头</el-button>
						<el-button type="primary"v-if="videoStatus" style="width: 100px;" size="mini" @click="videoControl(false)">关闭摄像头</el-button>
						<el-button type="primary"v-if="!shareStatus" style="width: 100px;" size="mini" @click="changeVideo()">屏幕分享</el-button>
						<el-button type="danger"v-if="shareStatus" style="width: 100px;" size="mini" @click="stopShare()">停止分享</el-button>
					</div>
				</el-row>
			</el-col>
			<el-col :span="10" style="margin-left: 30px;">
				<div style="font-size: 24px;font-weight: bolder;width: 50%;text-align: left;color: #409eff;">
					<label >直播预览</label>
				</div>
				<SrsRtcPull scanvideodomId="srsRtcPullPreview"  ref="srsRtcPullPreview" style="width: 50%;"></SrsRtcPull>
				<div style="font-size: 24px;font-weight: bolder;width: 50%;text-align: left;color: #409eff;">
					<label >连麦客户端</label>
				</div>
				<SrsRtcPull scanvideodomId="srsRtcPullApplyMic" ref="srsRtcPullApplyMic" style="width: 50%;"></SrsRtcPull>
			</el-col>
		</el-row>
		
	</div>
</template>

<script>
import SrsRtcPull from '@/components/SrsRtcPull'

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia;
var PeerConnection = window.RTCPeerConnection ||
    window.mozRTCPeerConnection ||
    window.webkitRTCPeerConnection;

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
import axios from "axios"
const { io } = require("socket.io-client");
export default {
  name: 'srs-rtc-push',
  components: {
    SrsRtcPull
  },
  data(){
	  return{
		  flv:'',
		  pc:undefined,
		  localstream:undefined,
		  streamId:'localStream-'+Date.now(),
		  scanUrlFlv:undefined,
		  scanUrlHls:undefined,
		  videoStatus:true,
		  audioStatus:true,
		  shareStatus:false,
	  }
  },
  created() {
	  if(getParams("userId")){
	  	this.init(getParams("userId"),getParams("roomId"),getParams('userId'))
	  }
  },
  methods:{
	  //连接socket服务器
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
	  		if(e['type'] === 'applyMic'){
				//自动同意
				let params ={	"userId": getParams('userId'),"targetUid":e.data.userId}
				that.linkSocket.emit('acceptApplyMic',params)
				let remoteStreamId = e.data.streamId
				that.$refs['srsRtcPullApplyMic'].getPullSdp(remoteStreamId)
	  		}
	  	})
	  	this.linkSocket.on("error",(e)=>{
	  		console.log("error",e)
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
					//按照给是组装flv和hls点播地址 （SRS官网指定格式）
					that.scanUrlFlv = that.$srsServerFlvURL+streamId+'.flv'
					that.scanUrlHls = that.$srsServerFlvURL+streamId+'.m3u8'
					//推流成功后直接webrtc拉流预览 如果拉流这个步骤还没学的话等学完下节课再看这里 
					that.preLive()
				}else{
					this.$message.error("推流失败请重试")
				}
			}).catch(err => {
				console.error("SRS 推流异常",err)
				this.$message.error("推流异常，请检查流媒体服务器")
			})
	   },
	   preLive(){
		   this.$refs['srsRtcPullPreview'].getPullSdp(this.streamId)
	   },
	   videoControl(b){
		   if(this.pc){
			  this.videoStatus = !this.videoStatus  
			  const senders = this.pc.getSenders();
			  const send = senders.find((s) => s.track.kind === 'video')
			  send.track.enabled = b 
		   }else{
			   this.$message.error("请先点击推流")
		   }
	   },
	   audioControl(b){
		   if(this.pc){
			   console.log(this.pc)
			   this.audioStatus = !this.audioStatus 
			  const senders = this.pc.getSenders();
			  const send = senders.find((s) => s.track.kind === 'audio')
			  send.track.enabled = b 
		   }else{
			   this.$message.error("请先点击推流")
		   }
	   },
	   async getShareMedia(){
	   	const constraints = {
	   		video:{width:1920,height:1080},
	   		audio:false
	   	};
	   	return await navigator.mediaDevices.getDisplayMedia(constraints).catch(handleError);
	   },
	   async changeVideo(){
		   if(!this.pc){
			   this.$message.error("请先点击推流")
			   return
		   }
		   this.shareStream = await this.getShareMedia()
		   const [videoTrack] = this.shareStream.getVideoTracks();
		   const senders = this.pc.getSenders();
		   const send = senders.find((s) => s.track.kind === 'video')
		   send.replaceTrack(videoTrack)
		   this.shareStatus = true
	   },
	   stopShare(){
		   if(this.shareStream){
			   this.shareStream.getTracks().forEach(e => e.stop())
			   this.shareStream = undefined
			   this.shareStatus = false
			   const [videoTrack] = this.localstream.getVideoTracks();
			   const senders = this.pc.getSenders();
			   const send = senders.find((s) => s.track.kind === 'video')
			   send.replaceTrack(videoTrack)
		   }
	   },
	   
	  
  }
}
</script>

<style scoped>
	.container{
		padding-top: 20px;
		height: 90vh;
	}
	
</style>