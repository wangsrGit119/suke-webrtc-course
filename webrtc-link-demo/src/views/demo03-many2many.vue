<template>
	<div class="container">
		<el-row style="padding: 20px;">
			<el-descriptions title="会议信息">
			    <el-descriptions-item label="用户名">{{formInline.nickname}}</el-descriptions-item>
			    <el-descriptions-item label="唯一身份识别">{{formInline.userId}}</el-descriptions-item>
			    <el-descriptions-item label="房间号">{{formInline.roomId}}</el-descriptions-item>
			</el-descriptions>
		</el-row>
		<el-row >
			<el-col :span="24">
				<el-row>
					<div id="allVideo" style="display: flex;flex-direction: row;justify-content: flex-start;flex-wrap: wrap;">
						<video id="localdemo01" @click="getLocalStreamSettings()" autoplay  muted></video>
						<label style="z-index:999;position: fixed;right: 25px;bottom: 30px;">
							<el-button  type="warning" size="mini" @click="getLocalStreamSettings">本地媒体流最新参数</el-button>
						</label>
					</div>
				</el-row>
				<el-row>
					<div class="frame-videos" id="frame-videos">
						<div v-if="formInline.userId !== item.userId" :id="item.userId"  v-for="(item,index) in roomUserList" :ref="item.userId" :key="item.userId">
							<label>
							{{item.nickname}}
							 <span style="color: bisque;">
							 {{item.bitrate}} 
							 </span>
							 <el-button type="info" size="mini" @click="getRtcPeerInfo(item.userId)">变更画面参数</el-button>
							 <el-button type="warning" size="mini" @click="setBiterate(item.userId)">变更Bitrate</el-button>
							</label>
						</div>
					</div>
				</el-row>
			</el-col>
		</el-row>
		
		<el-row style="position: fixed;bottom: 20px;width: 100%;">
			<div>
				<el-button v-if="!mediaStatus.video" @click="videoControl(true)">打开视频</el-button>
				<el-button v-if="mediaStatus.video" @click="videoControl(false)">关闭视频</el-button>
				<el-button v-if="!mediaStatus.audio" @click="audioControl(true)">打开麦克风</el-button>
				<el-button v-if="mediaStatus.audio" @click="audioControl(false)">关闭麦克风</el-button>
				<el-button  @click="showDetails()">stats</el-button>
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
	import FingerprintJS from '@fingerprintjs/fingerprintjs';
	const fpPromise = FingerprintJS.load()
	const { io } = require("socket.io-client");
	var PeerConnection = window.RTCPeerConnection ||
	        window.mozRTCPeerConnection ||
	        window.webkitRTCPeerConnection;
	
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
		alert("缺少必要的音频或视频输入驱动设备")
	    console.error('navigator.MediaDevices error: ', error.message, error.name);
	}
	var RtcPcMaps = new Map()
	const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://'
	
	export default {
		name:'demo03-many2many',
		data(){
			return{
				linkSocket:undefined,
				centerDialogVisible:true,
				rtcPcParams:{
					// iceTransportPolicy: 'relay', //强制走中继
					iceServers: [
						// {urls: 'turn:124.70.x.x:3478', username:'suc', credential:'suc001'},
						]
				},
			
				roomUserList:[],
				localDevice:{
					audioIn:[],
					videoIn: [],
					audioOut: []
				},
				mediaStatus:{
					audio:false,
					video:false
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
				statsTimerMap:new Map(),//计时器
				lastPeerStatsMap:new Map(),//上一次统计信息
				localStream:undefined,
				rtcmessage:undefined,
				constraintOpt:{
					audio:true,
					video:{
						width: 720, height: 480
					}
				},

				
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
				  
		 if(this.talkingTimer){
			 clearInterval(this.talkingTimer)
		 }
		 this.talkingTimer = setInterval(() =>{
			 that.listenerIsTalking()
		 },2000)
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
			async getRtcPeerInfo(uid){
				let pcKey = this.formInline.userId+'-'+uid
				let p = RtcPcMaps.get(pcKey)
				if(p){
					const senders = p.getSenders();
					const sender = senders.find((s) => s.track.kind === 'video')
					console.log("设置前参数",sender.track.getSettings())
					let height = 200
					let frameRate = 30
					let aspectRatio =  2.777777778
					await sender.track.applyConstraints({ height ,frameRate,aspectRatio});
					const receivers = p.getReceivers();
					const receive = receivers.find((s) => s.track.kind === 'video')
					console.log("远程流画面设置",receive.track.getSettings())
					
				}
			},
			async setBiterate(uid){
				let pcKey = this.formInline.userId+'-'+uid
				let pc = RtcPcMaps.get(pcKey)
				if(pc){
					let senders = pc.getSenders()
					let sender = senders.find((s) => s.track.kind === 'video')
					const params = sender.getParameters();
					//比特率设置
					let bitrate = 100*1000
					params.encodings[0].maxBitrate = bitrate;
					 //同步参数
					await sender.setParameters(params);
				}	
			},
			async getLocalStreamSettings(){
				let videoTrack = this.localStream.getVideoTracks()[0]
				console.log("本地媒体流最新参数",videoTrack.getSettings())
			},
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
			},
			removeChildVideoDom(domId){
				let video = document.getElementById(domId)
				if(video){
					video.parentNode.removeChild(video)
				}
			},
			createRemoteDomVideoStream(domId,trick){
				let parentDom  = document.getElementById(domId)
				let id = domId+'-media'
				let video = document.getElementById(id)
				if(!video){
					video = document.createElement('video')
					video.id = id
					video.controls = false;
					video.autoplay = true;
					video.muted = false
					video.style.width = '100%'
					video.style.height = '100%'
				}
				let stream = video.srcObject
				console.log("stream==>trick",stream,trick)
				if(stream){
					stream.addTrack(trick)
				}else{
					let newStream = new MediaStream()
					newStream.addTrack(trick)
					video.srcObject =newStream
					video.muted = false
					parentDom.appendChild(video)
				}
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
					//获取房间用户列表（新用户进房间后需要和房间内每个用户进行RTC连接 后进入着主动push offer）
					that.linkSocket.emit('roomUserList',{roomId:that.formInline.roomId})
					
				})
				this.linkSocket.on("roomUserList",(e)=>{
					console.log("roomUserList",e)
					that.roomUserList = e;
					//拿到房间用户列表之后开始建立RTC连接
					 that.initMeetingRoomPc();
				})
				this.linkSocket.on("msg",async (e)=>{
					console.log("msg",e)
					if(e['type'] === 'join' || e['type'] === 'leave'){
						const userId = e['data']['userId']
						const nickname = e['data']['nickname']
						if(e['type'] === 'join'){
							that.$message.success(nickname+" 加入房间")
							that.roomUserList.push({
								userId:userId,
								nickname:nickname,
								roomId:that.formInline.roomId
							})
						}else{
							that.$message.success(nickname+" 离开房间")
							RtcPcMaps.delete(that.formInline.userId+'-'+userId)
							that.removeChildVideoDom(userId)
						}
						
					}
					if(e['type'] === 'call'){
						await that.onCall(e)
					}
					if(e['type'] === 'offer'){
						await that.onRemoteOffer(e['data']['userId'],e['data']['offer'])
					}
					if(e['type'] === 'answer'){
						await that.onRemoteAnswer(e['data']['userId'],e['data']['answer'])
					}
					if(e['type'] === 'candidate'){
						that.onCandiDate(e['data']['userId'],e['data']['candidate'])
					}
				})
				this.linkSocket.on("error",(e)=>{
					console.log("error",e)
				})
			},
			onCandiDate(fromUid,candidate){
				const localUid = this.formInline.userId
				let pcKey = localUid+'-'+fromUid
				let pc = RtcPcMaps.get(pcKey)
				pc.addIceCandidate(candidate)
			},
			async initMeetingRoomPc(){
				const that = this
				if(!this.localStream){
					this.localStream = await this.getLocalUserMedia()
					//开始静音和关闭摄像头
					this.initMediaStatus()
				}
				this.setDomVideoStream("localdemo01",this.localStream)
				const localUid = this.formInline.userId
				let others = this.roomUserList.filter(e => e.userId !== localUid).map((e,index) =>{return e.userId})
				others.forEach(async (uid) => {
					let pcKey = localUid+'-'+uid
					let pc = RtcPcMaps.get(pcKey)
					if(!pc){
						pc = new PeerConnection(that.rtcPcParams)
						RtcPcMaps.set(pcKey,pc)
					}
					for (const track of that.localStream.getTracks()) {
					    pc.addTrack(track);
					}
					//创建offer
					let offer = await pc.createOffer({iceRestart:true});
					//设置offer未本地描述
					await pc.setLocalDescription(offer)
					//发送offer给被呼叫端
					let params = {"targetUid":uid,"userId":localUid,"offer":offer}
					that.linkSocket.emit("offer",params)
					that.onPcEvent(pc,localUid,uid)
				})
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
			onPcEvent(pc,localUid,remoteUid){
				const that = this
				pc.ontrack = function(event) {
					console.log(event)
					that.createRemoteDomVideoStream(remoteUid,event.track)
				};
				pc.onicecandidate = (event) => {
				  if (event.candidate) {
					that.linkSocket.emit('candidate',{'targetUid':remoteUid,"userId":localUid,"candidate":event.candidate})
				  } else {
				    /* 在此次协商中，没有更多的候选了 */
					console.log("在此次协商中，没有更多的候选了")
				  }
				}
			},
			async onRemoteOffer(fromUid,offer){
				const localUid = this.formInline.userId
				let pcKey = localUid+'-'+fromUid
				let pc = RtcPcMaps.get(pcKey)
				if(!pc){
					pc = new PeerConnection(this.rtcPcParams)
					RtcPcMaps.set(pcKey,pc)
				}
				this.onPcEvent(pc,localUid,fromUid)
				for (const track of this.localStream.getTracks()) {
				    pc.addTrack(track);
				}
				this.localStream.getAudioTracks[0]
				await pc.setRemoteDescription(offer)
				let answer = await pc.createAnswer();
				await pc.setLocalDescription(answer);
				let params = {"targetUid":fromUid,"userId":localUid,"answer":answer}
				this.linkSocket.emit("answer",params)
			},
			async onRemoteAnswer(fromUid,answer){
				const localUid = this.formInline.userId
				let pcKey = localUid+'-'+fromUid
				let pc = RtcPcMaps.get(pcKey)
				await pc.setRemoteDescription(answer);
			},
			changeMedia(){
				console.log(RtcPcMaps);
			},
			audioControl(b){
				RtcPcMaps.forEach((v,k) => {
					const senders = v.getSenders();
					const send = senders.find((s) => s.track.kind === 'audio')
					send.track.enabled = b
					this.mediaStatus.audio = send.track.enabled
				})
				this.localStream.getAudioTracks()[0].enabled = b
				this.mediaStatus.audio = b
			},
			videoControl(b){
				RtcPcMaps.forEach((v,k) => {
					const senders = v.getSenders();
					const send = senders.find((s) => s.track.kind === 'video')
					send.track.enabled = b
					this.mediaStatus.video = send.track.enabled
				})
				this.localStream.getVideoTracks()[0].enabled = b
				this.mediaStatus.video = b
			},
			initMediaStatus(){
				this.localStream.getVideoTracks()[0].enabled = false
				this.localStream.getAudioTracks()[0].enabled = false
				 this.$notify({
				          title: '温馨提示',
						  type:'warning',
				          message: '进入房间默认已关闭你的麦克风和摄像头，请手动打开',
				          duration: 0
				        });
			},
			showDetails(){
				console.log(this.localStream);
				let userClients = this.roomUserList.filter(e => e.userId != this.formInline.userId)
				userClients.forEach(e => {
					let peer = RtcPcMaps.get(this.formInline.userId+'-'+e.userId)
					if(peer){
						this.getNetStats(e.userId,peer)
					}
				})
			},
			getNetStats(userId,pc){
				let that = this
				let timer = this.statsTimerMap.get(userId)
				if(timer){
					clearInterval(timer)
				}else{
					timer = setInterval(()=>{
						that.calculateReceiverBitrate(userId,pc)
					},2000)
					this.statsTimerMap.set(userId,timer)
				}
			},
			calculateSendBitrate(userId,pc){
				let that = this
				let lastResultForStats = this.lastPeerStatsMap.get(userId)
				pc.getStats().then(res => {
					res.forEach(report => {
						let bytes;
					  let headerBytes;
					  let packets;
					  //出口宽带 outbound-rtp  入口宽带 inbound-rtp
					  if (report.type === 'outbound-rtp' && report.kind ==='video') {
							const now = report.timestamp;
							bytes = report.bytesSent;
							headerBytes = report.headerBytesSent;
					        packets = report.packetsSent;
							
						if (lastResultForStats && lastResultForStats.has(report.id)) {
							let bf = bytes-lastResultForStats.get(report.id).bytesSent
							let hbf = headerBytes - lastResultForStats.get(report.id).headerBytesSent
							let pacf = packets - lastResultForStats.get(report.id).packetsSent
							let t = now - lastResultForStats.get(report.id).timestamp
							// calculate bitrate
							const bitrate = (8 * bf/t).toFixed(2);
							const headerrate = (8 * hbf/t).toFixed(2);
							const packetrate = Math.floor(1000 * pacf/t);
							console.log(`${userId} ==> Bitrate ${bitrate} kbps, overhead ${headerrate} kbps, ${packetrate} packets/second`);
							}
						}
					})
					that.lastPeerStatsMap.set(userId,res)
				})
			},
			calculateReceiverBitrate(userId,pc){
				let that = this
				let lastResultForStats = this.lastPeerStatsMap.get(userId)
				pc.getStats().then(res => {
					res.forEach(report => {
						let bytes;
					  let headerBytes;
					  let packets;
					  //出口宽带 outbound-rtp  入口宽带 inbound-rtp
					  if (report.type === 'inbound-rtp' && report.kind ==='video') {
							const now = report.timestamp;
							bytes = report.bytesReceived;
							headerBytes = report.headerBytesReceived;
					        packets = report.packetsReceived;
							
						if (lastResultForStats && lastResultForStats.has(report.id)) {
							let bf = bytes-lastResultForStats.get(report.id).bytesReceived
							let hbf = headerBytes - lastResultForStats.get(report.id).headerBytesReceived
							let pacf = packets - lastResultForStats.get(report.id).packetsReceived
							let t = now - lastResultForStats.get(report.id).timestamp
							// calculate bitrate
							const bitrate = (8 * bf/t).toFixed(2);
							const headerrate = (8 * hbf/t).toFixed(2);
							const packetrate = Math.floor(1000 * pacf/t);
							let obj = that.roomUserList.filter(e => e.userId === userId)[0]
							console.log(obj)
							that.$set(obj,'bitrate',bitrate + ' kbps')
							console.log(`${userId} ==> Bitrate ${bitrate} kbps, overhead ${headerrate} kbps, ${packetrate} packets/second`);
							}
						}
					})
					that.lastPeerStatsMap.set(userId,res)
				})
			},
			listenerIsTalking(){
				RtcPcMaps.forEach((v,i) => {
					let senders = v.getSenders()
					//获取音频或者视频 判断是否激活状态 如果是则表明正在视频或者正在语音
					
				})
				
			},
			getAudioStatus(domId){
				console.log("domId",domId)
				let video = document.getElementById(domId)
				let stream = video.srcObject
				return stream.getAudioTracks()[0].enabled
			},
			
		},
		watch: {
		    
		  }
		
	}
</script>

<style scoped>
	html,body{
		margin: 0;
		padding: 0;
	}
	
	.container{
		margin: 20px 0 20px 0;
		padding: 0;
	}
	#localdemo01{
		width: 300px;
		height: 200px;
		position: fixed;
		bottom: 24px;
		right: 4px;
	}
	
	.frame-videos{
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: flex-start;
		padding: 30px;
	}
	.frame-videos div{
		border: 1px blueviolet solid;
		width: 23%;
		height: 200px;
		position: relative;
		background-color: black;
	}
	.frame-videos div label{
		color: white;
		position: absolute;
		bottom: 2px;
		left: 2px;
		z-index: 9999;
	}
	.dialog-inner-container{
		margin-left:35%;
		margin-top: 5%;
	}
</style>
