<template>
	<div class="container">
		<el-row >
			<el-col :span="12" style="">
				<video id="videoElement" style="object-fit: fill;" controls width="700px" height="450px"></video>
				<el-row style="display: flex;flex-direction: column;justify-content: center;align-items: center;height: auto">
					<el-tag style="width: 600px;">当前流ID {{streamId}}</el-tag>
					
					<div>
						<el-button type="danger" style="width: 130px;" size="mini" @click="playMp4AndCam()">推流(Mp4和摄像头)</el-button>
						<el-button type="danger" style="width: 130px;" size="mini" @click="playScreenAndCam()">推流(摄像头和屏幕)</el-button>
						
						<el-button type="danger" v-if="!audioStatus" style="width: 100px;" size="mini" @click="audioControl(true)">打开麦克风</el-button>
						<el-button type="primary" v-if="audioStatus" style="width: 100px;" size="mini" @click="audioControl(false)">关闭麦克风</el-button>
						<el-button type="danger" v-if="!videoStatus" style="width: 100px;" size="mini" @click="videoControl(true)">打开摄像头</el-button>
						<el-button type="primary"v-if="videoStatus" style="width: 100px;" size="mini" @click="videoControl(false)">关闭摄像头</el-button>
						<el-button type="danger"v-if="shareStatus" style="width: 100px;" size="mini" @click="stopShare()">停止分享</el-button>
					</div>
				</el-row>
			</el-col>
			<el-col :span="10" style="margin-left: 30px;">
				<div style="font-size: 24px;font-weight: bolder;width: 50%;text-align: left;color: #409eff;">
					<label >推流预览</label>
				</div>
				<SrsRtcPull scanvideodomId="srsRtcPullPreview"  ref="srsRtcPullPreview" style="width: 80%;"></SrsRtcPull>
				
				</el-col>
		</el-row>
		
	</div>
</template>

<script>
import SrsRtcPull from '@/components/SrsRtcPull'
import "video-stream-merger";
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
export default {
  name: 'stream-merger-push',
  components: {
    SrsRtcPull
  },
  data(){
	  return{
		  flv:'',
		  pc:undefined,
		  localstream:undefined,
		  mergerVideo:undefined,
		  shareStream:undefined,
		  streamId:'localStream-'+Date.now(),
		  scanUrlFlv:undefined,
		  scanUrlHls:undefined,
		  videoStatus:true,
		  audioStatus:true,
		  shareStatus:false,
	  }
  },
  created() {
	  
  },
  mounted() {
  	// this.mergerVideoFC()
  },
  methods:{
	  //静态视频和摄像头
	  async mergerVideoFC(){
		  this.localstream = await this.getLocalUserMedia(null,null)
		  const that = this
		  that.mergerVideo = new VideoStreamMerger(
		  {
		    width: 400,   
		    height: 300,  
		    fps: 25,       
		    clearRect: true, 
		  }
		  );
		  let videoFile = "/190318231014076505.mp4"
		  var videoElement = document.createElement('video')
		  videoElement.playsinline = true;
		  videoElement.muted = true
		  videoElement.src = videoFile
		  videoElement.autoplay = true
		  videoElement.loop = true
		  videoElement.play()
		  
		  that.mergerVideo.addMediaElement('mp4',videoElement, {
			x: 0,
			y: 0,
			width: that.mergerVideo.width,
			height: that.mergerVideo.height,
			mute: false
		  });
		  that.mergerVideo.addStream(this.localstream, {
			x: 0,
			y: 0,
			width: 200,
			height: 200,
			mute: false
		  });
		  that.mergerVideo.start();
		  console.log("merger.result",that.mergerVideo.result);
		  await this.setDomVideoStream('videoElement',that.mergerVideo.result)
		  return that.mergerVideo.result
	  },
	  //屏幕分享和摄像头
	  async mergerVideoSC(){
		  //摄像头流
		  this.localstream = await this.getLocalUserMedia(null,null)
		  //屏幕分享流
		  this.shareStream = await this.getShareMedia()
		  this.shareStatus= true
		  const that = this
		  
		  that.mergerVideo = new VideoStreamMerger({ fps: 24, clearRect: true, });
		  
		  that.mergerVideo.addStream(this.shareStream, {
			x: 0,
			y: 0,
			width: that.mergerVideo.width,
			height: that.mergerVideo.height,
			mute: true
		  });
		  that.mergerVideo.addStream(this.localstream, {
			x: 0,
			y: 0,
			width: 200,
			height: 150,
			mute: false
		  });
		  that.mergerVideo.start();
		  await this.setDomVideoStream('videoElement',that.mergerVideo.result)
		  return that.mergerVideo.result
	  },
	   async playMp4AndCam(){
		   let megerVideo = await this.mergerVideoFC()
		   await this.getPushSdp(this.streamId,megerVideo)
	   },
	   async playScreenAndCam(){
		   let megerVideo = await this.mergerVideoSC()
		   await this.getPushSdp(this.streamId,megerVideo)
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