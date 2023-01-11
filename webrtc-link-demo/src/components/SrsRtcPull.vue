<template>
  <div class="scan-video-dom">
    <video :id="scanvideodomId" controls width="100%" height="100%" autoplay muted></video>
  </div>
</template>

<script>
navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia;
var PeerConnection = window.RTCPeerConnection ||
    window.mozRTCPeerConnection ||
    window.webkitRTCPeerConnection;
function handleError(error) {
    console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
}
import axios from "axios"

export default {
  name: 'SrsRtcPull',
  props: {
    scanvideodomId: String
  },
  data() {
  	return {
		pc:undefined,
	}
  },
  created() {
  	console.log("组件")
  },
  methods:{
	  async getPullSdp(streamId){
		const that = this
		if(that.pc){
			that.pc.close();
		}
		that.pc = await new PeerConnection(null);
		that.pc.addTransceiver("audio", {direction: "recvonly"});
		that.pc.addTransceiver("video", {direction: "recvonly"});
		that.pc.ontrack  = function (e) {
			that.setDomVideoTrick(e.track)
		}
		let offer = await that.pc.createOffer();
		await that.pc.setLocalDescription(offer)
		let data = {
		  "api": this.$srsServerAPIURL+"rtc/v1/play/",
		  "streamurl": this.$srsServerRTCURL+streamId,
		  "sdp": offer.sdp
		}
		axios.post(this.$srsServerAPIURL+'rtc/v1/play/',data)
		.then( async res => {
			res = res.data
			console.log(res)
			if(res.code === 0){
				await that.pc.setRemoteDescription(new RTCSessionDescription({type: 'answer', sdp: res.sdp}))
			}
		}).catch(err => {
			console.error("SRS 拉流异常",err)
		})
	  },
	  closePlay(){
		  if(this.pc){
		  	this.pc.close();
		  }
		  let video = document.getElementById(this.scanvideodomId)
		  if(video && video.srcObject){
		  	let stream = video.srcObject
		  	stream.getTracks().forEach(e => e.stop())
		  	video.srcObject = null
		  }
	  },
	  setDomVideoTrick(trick){
	  	let video = document.getElementById(this.scanvideodomId)
	  	let stream = video.srcObject
	  	if(stream){
	  		stream.addTrack(trick)
	  	}else {
	  		stream = new MediaStream()
	  		stream.addTrack(trick)
	  		video.srcObject = stream
	  		video.controls = true;
	  		video.autoplay = true;
			video.style.width="100%"
			video.style.height="100%"
	  		video.muted = true
	  	}
	  },
	  
  }
}
</script>

<style scoped>

</style>
