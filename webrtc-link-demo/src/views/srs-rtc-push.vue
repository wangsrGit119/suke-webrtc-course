<template>
	<div class="container">
		<el-row  >
			<video id="videoElement" style="object-fit: fill;" controls width="700px" height="450px"></video>
		</el-row>
		<el-row style="display: flex;flex-direction: column;justify-content: center;align-items: center;">
			<el-tag style="width: 600px;">当前流ID {{streamId}}</el-tag>
			<el-tag style="width: 600px;" type="warning" v-if="scanUrlFlv">FLV地址：{{scanUrlFlv}}</el-tag>
			<el-tag style="width: 600px;" type="danger" v-if="scanUrlHls">HLS地址：{{scanUrlHls}}</el-tag>
			<el-button type="primary" style="width: 600px;" size="mini" @click="play()">推流</el-button>
		</el-row>
	</div>
</template>

<script>
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
  name: 'srs-rtc-push',
  components: {
    
  },
  data(){
	  return{
		  flv:'',
		  pc:undefined,
		  localstream:undefined,
		  streamId:'localStream-'+Date.now(),
		  scanUrlFlv:undefined,
		  scanUrlHls:undefined
	  }
  },
  created() {
  },
  methods:{
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
					that.scanUrlFlv = that.$srsServerFlvURL+streamId+'.flv'
					that.scanUrlHls = that.$srsServerFlvURL+streamId+'.m3u8'
				}
			}).catch(err => {
				console.error("SRS 推流异常",err)
			})
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