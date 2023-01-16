<template>
	<div class="container">
		<el-row  style="display: flex;flex-direction: row;justify-content: flex-start;flex-wrap: wrap;">
			<div style="position: relative;width: 400px;height: 300px;">
				<label style="position: absolute;left: 5px;bottom: 5px;color: antiquewhite;font-size: 18px;z-index: 999;">{{formInline.nickname}}</label>
				<video id="localMediaDom" style="object-fit: fill;height: 100%;width: 100%;" ></video>
			</div>
			<div style="position: relative;width: 400px;height: 300px;" v-for="item in others" :key="item.userId" :id="item.userId">
				<label style="position: absolute;left: 5px;bottom: 5px;color: antiquewhite;font-size: 18px;z-index: 999;">{{item.nickname}}</label>
				<video :id="item.userId+'-video'" style="object-fit: fill;height: 100%;width: 100%;" controls  ></video>
			</div>
		</el-row>
		<el-dialog
		  :visible.sync="centerDialogVisible"
		  :close-on-click-modal="false"
		  :close-on-press-escape="false"
		  :show-close="false"	
		  fullscreen
		  center>
		  <div class="dialog-inner-container">
			  <el-form  :model="formInline" :rules="rules" ref="ruleForm"  label-width="80px" style="width: 300px">
			    <el-form-item label="身份ID" prop="userId">
			      <el-input style="width:220px " v-model="formInline.userId" placeholder="不填默认为浏览器ID"></el-input>
			    </el-form-item>
				<el-form-item label="房间号" prop="roomId">
			      <el-input style="width:220px " v-model="formInline.roomId" placeholder="房间号"></el-input>
			    </el-form-item>
				<el-form-item label="用户名" prop="nickname">
			      <el-input style="width:220px " v-model="formInline.nickname" placeholder="展示昵称"></el-input>
			    </el-form-item>
			    <el-form-item label="摄像头" prop="videoId">
			      <el-select v-model="formInline.videoId" placeholder="摄像头">
			        <el-option v-for="(item,index) in localDevice.videoIn " :key="index" :label="item.label" :value="item.id"></el-option>
			      </el-select>
			    </el-form-item>
				<el-form-item label="麦克风" prop="audioInId">
				  <el-select v-model="formInline.audioInId" placeholder="麦克风">
					<el-option v-for="(item,index) in localDevice.audioIn " :key="index" :label="item.label" :value="item.id"></el-option>
				  </el-select>
				</el-form-item>
				<el-form-item label="分辨率" prop="rao">
				  <el-select v-model="formInline.rao" placeholder="分辨率">
					<el-option v-for="(item,index) in raoList " :key="index" :label="item" :value="item"></el-option>
				  </el-select>
				</el-form-item>
			    <el-form-item>
			        <el-button style="margin-left: 70px;" type="warning" @click="joinRoom('ruleForm')">进入</el-button>
			    </el-form-item>
			  </el-form>
		  </div>
		</el-dialog>
	</div>
</template>

<script>
import axios from "axios"

import FingerprintJS from '@fingerprintjs/fingerprintjs';
const fpPromise = FingerprintJS.load()
const { io } = require("socket.io-client");
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
/**
* device list init 
*/
var localDevice = null;
function initInnerLocalDevice(){
	const that  = this
	 localDevice = {
		audioIn:[],
		videoIn: [],
		audioOut: []
	}
	let constraints = {video:true, audio: true}
	if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
		console.log("浏览器不支持");
		return;
	}
	navigator.mediaDevices.getUserMedia(constraints)
		.then(function(stream) {
			stream.getTracks().forEach(trick => {
				trick.stop()
			})
			
			// List cameras and microphones.
			navigator.mediaDevices.enumerateDevices()
				.then(function(devices) {
					devices.forEach(function(device) {
						let obj = {id:device.deviceId, kind:device.kind, label:device.label}
						if(device.kind === 'audioinput'){
							if(localDevice.audioIn.filter(e=>e.id === device.deviceId).length === 0){
								localDevice.audioIn.push(obj)
							}
						}if(device.kind === 'audiooutput'){
							if(localDevice.audioOut.filter(e=>e.id === device.deviceId).length === 0){
								localDevice.audioOut.push(obj)
							}
						}else if(device.kind === 'videoinput' ){
							if(localDevice.videoIn.filter(e=>e.id === device.deviceId).length === 0){
								localDevice.videoIn.push(obj)
							}
						}
					});
				})
				.catch(handleError);

		})
		.catch(handleError);
}
function handleError(error) {
	alert("缺少必要的音频或视频输入驱动设备")
	console.error('navigator.MediaDevices error: ', error.message, error.name);
}
export default {
  name: 'srs-meeting-room',
  components: {
    
  },
  data(){
	  return{
		  linkSocket:undefined,
		  centerDialogVisible:true,
		  roomUserList:[],
		  others:[],//除了自己房间内其他用户
		  RTCPushPeer:undefined,//推流
		  RTCPullPeerMap:new Map(),//拉流
		  localDevice:{
		  	audioIn:[],
		  	videoIn: [],
		  	audioOut: []
		  },
		  rules:{
		  	roomId: [
		  		{ required: true, message: '请填写房间号', trigger: 'change' }
		  	  ],
		  	nickname: [
		  		{ required: true, message: '请填写展示昵称', trigger: 'change' }
		  	  ],
		  	videoId: [
		  		{ required: true, message: '请选择摄像头', trigger: 'change' }
		  	  ],
		  	audioInId: [
		  		{ required: true, message: '请选择麦克风', trigger: 'change' }
		  	  ],
		    rao: [
		  	{ required: true, message: '请选择分辨率', trigger: 'change' }
		  	],
		  },
		  formInline:{
		  	rtcmessage:undefined,
		  	rtcmessageRes:undefined,//响应
		  	videoId:undefined,
		  	audioInId:undefined,
		  	nickname:undefined,//展示昵称
		  	roomId:undefined,//房间号
		  	rao:'640X480'
		  
		  },
		  raoList:[
		  	'1920X1080',
		  	'1080X720',
		  	'720X640',
		  	'640X480',
		  	'480X320'
		  ],
	  }
  },
  created() {
	  const that = this
		 initInnerLocalDevice()
		 this.localDevice = localDevice
		 console.log(localDevice)
		 let usession = window.sessionStorage.getItem("userInfo")
		 if(usession){
			 usession = JSON.parse(usession)
			 this.formInline = usession
		 }else{
			 this.formInline.nickname = getParams("nickname");
			 this.formInline.roomId = getParams("roomId");
			 this.formInline.userId = getParams("userId");
		 }
		 fpPromise
			 .then(fp => fp.get())
			 .then(result => {
				 if(!this.formInline.userId){
					 this.formInline.userId = result.visitorId
				 }
			  })
  },
  methods:{
	joinRoom(formName){
	this.$refs[formName].validate((valid) => {
		  if (valid) {
			this.init()
			window.sessionStorage.setItem("userInfo",JSON.stringify(this.formInline))
		  } else {
			console.log('error submit!!');
			return false;
		  }
		});
	},
	init(){
		const that = this
		console.log("server",this.$serverSocketUrl);
		this.linkSocket = io(this.$serverSocketUrl, {
			reconnectionDelayMax: 10000,
			transports: ["websocket"],
			query: that.formInline
		});
		this.linkSocket.on("connect",async (e)=>{
			console.log("server init connect success",that.linkSocket)
			that.centerDialogVisible = false //加入后
			//获取房间用户列表
			that.linkSocket.emit('roomUserList',{roomId:that.formInline.roomId})
			
		})
		this.linkSocket.on("roomUserList",(e)=>{
			console.log("roomUserList",e)
			that.roomUserList = e;
			that.initMeetingRoom()
		})
		this.linkSocket.on("msg",async (e)=>{
			console.log("msg",e)
			if(e['type'] === 'join' || e['type'] === 'leave'){
				const userId = e['data']['userId']
				const nickname = e['data']['nickname']
				if(e['type'] === 'join'){
					that.$message.success(nickname+" 加入房间")
					that.others.push({
						userId:userId,
						nickname:nickname
					})
					await that.getPullSdp(userId)
				}else{
					that.$message.success(nickname+" 离开房间")
					that.removeChildVideoDom(userId)
				}
				
			}
		})
		this.linkSocket.on("error",(e)=>{
			console.log("error",e)
		})
	},
	async initMeetingRoom(){
		const that = this
		if(!this.localStream){
			this.localStream = await this.getLocalUserMedia();
		}
		//本地预览自己的画面
		this.setDomVideoStream("localMediaDom",this.localStream);
		//推流
		await this.getPushSdp(this.formInline.userId,this.localStream);
		//判断房间内是否有其他人
		this.others = this.roomUserList.filter(e => e.userId != this.formInline.userId)
		for(let i=0; i< this.others.length ;i++){
			let user = this.others[i];
			//拉其他用户媒体流
			await this.getPullSdp(user.userId)
		}
	},
	/**
	 * 获取设备 stream
	 * @returns {Promise<MediaStream>}
	 */
	async getLocalUserMedia(){
		const audioId = this.formInline.audioInId
		const videoId = this.formInline.videoId
		let width = this.formInline.rao.split('X')[0] 
		let height = this.formInline.rao.split('X')[1] 
		console.log(width,height)
		const constraints = {
		    audio: {deviceId: audioId ? {exact: audioId} : undefined},
		    video: {
		        deviceId: videoId ? {exact: videoId} : undefined,
		        width:width,
		        height:height,
		        frameRate: { ideal: 20, max: 24 }
		    }
		};
		if (window.stream) {
		    window.stream.getTracks().forEach(track => {
		        track.stop();
		    });
		}
	    return await navigator.mediaDevices.getUserMedia(constraints).catch(handleError)
	},
	//指定dom挂载元素
	async setDomVideoStream(domId,newStream){
		let video = document.getElementById(domId)
		let stream = video.srcObject
		if(stream){
		    stream.getAudioTracks().forEach( e=>{
		        stream.removeTrack(e)
		    })
		    stream.getVideoTracks().forEach(e=>{
		        stream.removeTrack(e)
		    })
		}
		video.srcObject =newStream
		video.muted = true
		video.autoplay = true
	},
	//移除指定DOM
	removeChildVideoDom(domId){
		let video = document.getElementById(domId)
		if(video){
			video.parentNode.removeChild(video)
		}
	},
	//SRS 推流
	async getPushSdp(streamId,stream){
		const that = this
		that.RTCPushPeer = await new PeerConnection(null);
		that.RTCPushPeer.addTransceiver("audio", {direction: "sendonly"});
		that.RTCPushPeer.addTransceiver("video", {direction: "sendonly"});
		//send
		stream.getTracks().forEach(function (track) {
			that.RTCPushPeer.addTrack(track);
		});
		let offer = await that.RTCPushPeer.createOffer();
		await that.RTCPushPeer.setLocalDescription(offer)
		let data = {
		  "api": this.$srsServerAPIURL+"rtc/v1/publish/",
		  "streamurl": this.$srsServerRTCURL+streamId,
		  "sdp": offer.sdp
		}
		axios.post(this.$srsServerAPIURL+'rtc/v1/publish/',data)
		.then( async res => {
			res = res.data
			if(res.code === 0){
				await that.RTCPushPeer.setRemoteDescription(new RTCSessionDescription({type: 'answer', sdp: res.sdp}))
				this.$message.success("媒体流发布成功")
			}else{
				this.$message.error("推流失败请重试")
			}
		}).catch(err => {
			console.error("SRS 推流异常",err)
			this.$message.error("推流异常，请检查流媒体服务器")
		})
	},
	//SRS  拉流
	async getPullSdp(streamId){
		const that = this
		let pc = this.RTCPullPeerMap.get(streamId)
		if(pc){
			pc.close();
		}else{
			this.RTCPullPeerMap.set(streamId,pc)
		}
		pc = await new PeerConnection(null);
		pc.addTransceiver("audio", {direction: "recvonly"});
		pc.addTransceiver("video", {direction: "recvonly"});
		pc.ontrack  = function (e) {
			//这里DOM ID 就是用户UserID 和 streamID一致  
			that.setDomVideoTrick(streamId+'-video',e.track)
		}
		let offer = await pc.createOffer();
		await pc.setLocalDescription(offer)
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
				await pc.setRemoteDescription(new RTCSessionDescription({type: 'answer', sdp: res.sdp}))
			}
		}).catch(err => {
			console.error("SRS 拉流异常",err)
		})
	},
	setDomVideoTrick(domId,trick){
		let video = document.getElementById(domId)
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
	.container{
		padding-top: 20px;
		height: 90vh;
	}
	.dialog-inner-container{
		margin-left:35%;
		margin-top: 5%;
	}
</style>