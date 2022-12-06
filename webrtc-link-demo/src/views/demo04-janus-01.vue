<template>
	<div style="width: 98%;height: 95vh%;margin-top: 20px;">
		<el-row :gutter="20">
			<el-col :span="12" style="display: flex;flex-direction: row;">
				<el-input placeholder="请输入用户名" v-model="username"></el-input>
				<el-button type="success" @click="registerUser">注册</el-button>
				<el-input placeholder="请输入被呼叫者用户名" v-model="targetUserName"></el-input>
				<el-button type="primary" @click="call">呼叫</el-button>
			</el-col>
		</el-row>
		<el-row>
			<div class="streams">
				<video id="localDomId" height="300px" width="300px" controls muted></video>
				<video id="remoteVideo" height="300px" width="300px" controls></video>
			</div>
		</el-row>
		
	</div>
</template>

<script>
	function handleError(error) {
	    // alert("摄像头无法正常使用，请检查是否占用或缺失")
	    console.error('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
	}
	/**
	 * @author suc
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
		        console.log("浏览器不支持获取媒体设备");
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
				.then(()=>{
					console.log(localDevice)
					
				})
		        .catch(handleError);
		}
	import adapter from 'webrtc-adapter';
	import Janus from "@/utils/Janus.js";
	var janus;//全局变量
	var videoCallPluginHandle;//
	let opaqueId = "videocall-"+Janus.randomString(12);
	export default {
		name:'demo04-janus-01',
		data(){
			return{
				localDevice:{
					audioIn:[],
					videoIn: [],
					audioOut: []
				},
				formInline:{
					videoId:undefined,
					audioInId:undefined,
					audioOutId:undefined
				},
				username:undefined,//用户名
				targetUserName:undefined,//被呼叫方
			}
		},
		created() {
			initInnerLocalDevice()
			this.localDevice = localDevice
			this.initJanus()
		},
		methods:{
			initJanus(){
			  const that = this;
			  Janus.init({
				debug: true,
				dependencies: Janus.useDefaultDependencies({
				  adapter: adapter
				}),
				callback: ()=> {
				  if(!Janus.isWebrtcSupported()) {
					console.log('is not Supported Webrtc!');
					return;
				  }
				}
			  });
			  
			  Janus.log("opaqueId",opaqueId)
				// janus 注册并初始化
			  janus = new Janus({
						server: 'http://1.15.172.73:18088/janus',
						apisecret:'suc119119',
						success: function() {
								Janus.log("初始化成功")
								that.initVideoCallPlugin()
						},
						error: function(cause) {
								// Error, can't go on...
								Janus.log(cause)
						},
						destroyed: function() {
								// I should get rid of this
								Janus.log("destroyed")
						}
			 });
			},
			/**
			 * 初始化视频呼叫插件
			 */
			initVideoCallPlugin(){
				const that = this
				janus.attach({
						opaqueId:opaqueId,
				        plugin: "janus.plugin.videocall",
				        success: function(pluginHandle) {
				            //插件初始化成功后 pluginHandle 就是全局句柄，通过 pluginHandle可以操作当前
				            //会话的所有功能
							videoCallPluginHandle = pluginHandle
							// console.log("视频呼叫插件初始化成功",videoCallPluginHandle)
				        },
				        error: function(cause) {
				            //插件初始化失败
				        },
				       
				        onmessage: function(msg, jsep) {
							//msg 交互信息包括挂断 接听等事件监听
							// jsep  协商信令
							that.onMessageForVideoCall(msg,jsep)
				            
				        },
				        onlocaltrack: function(track, added) {
				            // 本地媒体流发布后可以监听
							console.log("本地媒体",track,added)
							if(added){
								that.setDomVideoTrick("localDomId",track)
							}
							
				        },
				        onremotetrack: function(track, mid, added) {
				            // 远端媒体流
							console.log("远程媒体",track,mid,added)
							if(added){
								that.setDomVideoTrick("remoteVideo",track)
							}
				        },
				        oncleanup: function() {
				            // PeerConnection 关闭监听
				            // 同时可以创建信的句柄(旧的可用)重新初始化
				        },
				        detached: function() {
				             // PeerConnection 关闭监听
				            // 同时可以创建信的句柄（旧的不可用）重新初始化
				        }
				    });
			},
			registerUser(){
				if(!this.username){
					this.$message.warning("请输入用户名")
					return
				}
				if(!videoCallPluginHandle){
					this.$message.warning("视频插件还未初始化")
					return
				}
				var register = { request: "register", username: this.username };
				videoCallPluginHandle.send({ message: register });
			},
			call(){
				const that = this
				videoCallPluginHandle.createOffer({
					//双向语音视频+datachannel
					tracks: [
						{ type: 'audio', capture: true, recv: true },
						{ type: 'video', capture: true, recv: true },
						{ type: 'data' },
					],
					success: function(jsep) {
						Janus.debug("呼叫端创建 SDP信息", jsep);
						var body = { request: "call", username: that.targetUserName };
						videoCallPluginHandle.send({ message: body, jsep: jsep });
					},
					error: function(error) {
						console.error("呼叫异常",error)
					}
				});
			},
			onMessageForVideoCall(msg,jsep){
				console.log(" ::: Got a message :::", msg);
				var result = msg["result"];
				if(result) {
					if(result["list"]) {
						var list = result["list"];
						console.log("注册Peers",list)
					} else if(result["event"]) {
						var event = result["event"];
						if(event === 'registered') {
							console.log("注册成功",msg)
							videoCallPluginHandle.send({ message: { request: "list" }});
						} else if(event === 'calling') {
							console.log("呼叫中")
						} else if(event === 'incomingcall') {
							let username = result["username"]
							console.log("来自于 【"+username+"】的呼叫")
							videoCallPluginHandle.createAnswer({
									jsep: jsep,
									tracks: [
										{ type: 'audio', capture: true, recv: true },
										{ type: 'video', capture: true, recv: true },
										{ type: 'data' },
									],
									success: function(jsep) {
										Janus.debug("应答 SDP!", jsep);
										var body = { request: "accept" };
										videoCallPluginHandle.send({ message: body, jsep: jsep });
									},
									error: function(error) {
										console.error("创建应答异常",error)
									}
								});
						} else if(event === 'accepted') {
							console.log("对方已接听同时设置协商信息",jsep)
							if(jsep){videoCallPluginHandle.handleRemoteJsep({ jsep: jsep });}
						} else if(event === 'update') {
							// An 'update' event may be used to provide renegotiation attempts
							if(jsep) {
								if(jsep.type === "answer") {
									videoCallPluginHandle.handleRemoteJsep({ jsep: jsep });
								} else {
									videoCallPluginHandle.createAnswer({
											jsep: jsep,
											tracks: [
												{ type: 'audio', capture: true, recv: true },
												{ type: 'video', capture: true, recv: true},
												{ type: 'data' },
											],
											success: function(jsep) {
												console.log("重新应答信令 SDP!", jsep);
												var body = { request: "set" };
												videoCallPluginHandle.send({ message: body, jsep: jsep });
											},
											error: function(error) {
												console.error(error)
											}
										});
								}
							}
						} else if(event === 'hangup') {
							console.log(result["username"] + "已挂断,原因:(" + result["reason"] + ")!");
							videoCallPluginHandle.hangup();
						} else if(event === "simulcast") {
							console.log("联播simulcast，暂时不用考虑")
						}
					}
				} else {
					// 出错
					var error = msg["error"];
					console.log("未知异常",msg)
					//挂断
					videoCallPluginHandle.hangup();
				}
			},
			/**
			 * 获取设备 stream
			 * @param constraints
			 * @returns {Promise<MediaStream>}
			 */
			async getLocalUserMedia(constraints){
			    return await navigator.mediaDevices.getUserMedia(constraints)
			},
			/**
			 * 获取指定媒体设备id对应的媒体流
			 * @author suke
			 * @param videoId
			 * @param audioId
			 * @returns {Promise<void>}
			 */
			async getTargetDeviceMedia(videoId,audioId){
			    const constraints = {
			        audio: {deviceId: audioId ? {exact: audioId} : undefined},
			        video: {
			            deviceId: videoId ? {exact: videoId} : undefined,
			            width:1920,
			            height:1080,
			            frameRate: { ideal: 10, max: 15 }
			        }
			    };
			    if (window.stream) {
			        window.stream.getTracks().forEach(track => {
			            track.stop();
			        });
			    }
			    //被调用方法前面有，此处不再重复
			    return await this.getLocalUserMedia(constraints).catch(handleError);
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
					video.controls = false;
					video.autoplay = true;
					// video.muted = false
					// video.style.width = '100%'
					// video.style.height = '100%'
				}
			}
			

		}
		
	}
</script>

<style scoped>
.streams{
	display: flex;
	flex-direction: row;
	justify-content: flex-start;
	margin: 20px;
}
	
</style>