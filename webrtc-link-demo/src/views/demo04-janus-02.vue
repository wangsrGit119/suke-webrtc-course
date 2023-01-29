<template>
	<div style="width: 98%;height: 95vh%;margin-top: 20px;">
		<el-row :gutter="20" style="display: flex;flex-direction: row;justify-content: center;align-items: center;">
			<el-col :span="8">
				<el-table
				      :data="userList"
				      style="width: 100%">
				      <el-table-column
				        prop="display"
				        label="用户"
				        show-overflow-tooltip>
				      </el-table-column>
				      <el-table-column
				        prop="talking"
				        label="talking"
				        >
						<template slot-scope="scope">
							<el-tag  type="warning" size="small">{{scope.row.talking}}</el-tag>
						</template>
				      </el-table-column>
				      <el-table-column
				        prop="publisher"
						label="publisher"
				        >
						<template slot-scope="scope">
							<el-tag  type="warning" size="small">{{scope.row.publisher}}</el-tag>
						</template>
				      </el-table-column>
					<el-table-column
						  fixed="right"
						  label="操作"
						  width="220">
						  <template slot-scope="scope">
							<el-button @click="kickOut(scope.row)" type="warning" size="small">踢出</el-button>
							<el-button  @click="closeMic(scope.row,true)" type="danger" size="small">禁言</el-button>
							<el-button  @click="closeMic(scope.row,false)" type="primary" size="small">解禁</el-button>
						  </template>
					 </el-table-column>
				    </el-table>
			</el-col>
			<el-col :span="16">
			<label>用户ID</label>
			<el-input style="width:150px;margin:3px;" placeholder="用户ID" v-model="userId"></el-input>
			<label>房间号</label>
			<el-input style="width:130px;margin:3px;" placeholder="请输入房间号" v-model="roomNumber"></el-input>
			<label>用户名</label>
			<el-input style="width:130px;margin:3px;" placeholder="请输入用户名" v-model="username"></el-input>
			<el-button type="success" @click="createRoom">创建房间</el-button>
			<el-button type="primary" @click="joinRoom">加入房间</el-button>
			</el-col>
		</el-row>
		<el-row>
			<div class="streams">
				<video id="localDomId" style="object-fit: fill;" height="300px" width="30%"  muted></video>
				<video id="multiStream" style="object-fit: fill;" height="300px" width="30%"  muted></video>
				<div v-for="(item,index) in publisherList" style="display: flex;flex-direction: row;flex-wrap: wrap;" :key="index">
					<div :id="item.id" style="width: 300px;height: 300px;position: relative;">
						<video :id="item.id+'-video'" style="object-fit: fill;width: 100%;height: 100%;"></video>
						<label style="position: absolute;left: 0px;bottom: 0px;color: mediumblue;font-size: 15px;background-color: aliceblue;width: 60%;">{{item.display}}</label>
					</div>
				</div>
			</div>
		</el-row>
		
		<el-row style="position: fixed;bottom: 220px;width: 100%;">
			<div>
				<el-button type="danger" size="mini" round @click="hangup()">挂断</el-button>
				<el-button type="warning" size="mini" round @click="replaceTrack()">replaceTrack</el-button>
				<el-button v-if="!videoStatus" type="warning" size="mini" round @click="controlVideo()">打开视频</el-button>
				<el-button v-if="videoStatus" type="primary" size="mini" round @click="controlVideo()">关闭视频</el-button>
				<el-button v-if="!audioStatus" type="warning" size="mini" round @click="controlAudio()">打开麦克风</el-button>
				<el-button v-if="audioStatus" type="primary" size="mini" round @click="controlAudio()">关闭麦克风</el-button>
				<el-button  type="primary" size="mini" round @click="startShareScreen()">开始屏幕共享</el-button>
			</div>
		</el-row>
		
		
	</div>
</template>

<script>
	function handleError(error) {
		alert("缺少必要的音频或视频输入驱动设备")
	    console.error('navigator.MediaDevices error: ', error.message, error.name);
	}
	import adapter from 'webrtc-adapter';
	import Janus from "@/utils/Janus.js";
	var janus;//全局变量
	var videoRoomPluginHandle;//
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
				username:"suc",//用户名
				userId:Date.now(),//用户随机ID
				private_id:undefined,//janus分配ID
				roomNumber:1001,//房间号
				bitrateTimer:null,
				videoStatus:true,//是否视频
				audioStatus:true,//是否音频
				globalAudioStatus:false,
				streamMap:new Map(),//
				publisherList:[],
				shareStream:undefined,
				shareStreamTag:false,
				userList:[],
				
			}
		},
		created() {
			const that = this
			this.initJanus()
			if(this.bitrateTimer){
				clearInterval(this.bitrateTimer)
			}
			
			setInterval(()=>{
				that.getRoomUserList()
			},2000)
			
			

		},
		methods:{
			initJanus(){
			  const that = this;
			  Janus.init({
				debug: false,
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
						server: that.$janusServerUrl,
						apisecret:'suc119119',
						success: function() {
								Janus.log("初始化成功")
								that.initVideoRoomPlugin()
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
			initVideoRoomPlugin(){
				const that = this
				janus.attach({
						plugin: "janus.plugin.videoroom",
						opaqueId: opaqueId,
				        success: function(pluginHandle) {
				            //插件初始化成功后 pluginHandle 就是全局句柄，通过 pluginHandle可以操作当前
				            //会话的所有功能
							videoRoomPluginHandle = pluginHandle
							console.log("会议插件初始化成功")
							
				        },
				        error: function(cause) {
				            //插件初始化失败
				        },
				       webrtcState: function(on) {
							console.log("WebRTC PeerConnection 状态 is " + (on ? "up" : "down") + " now");
				       },
					   slowLink: function(uplink, lost, mid) {
					   	console.warn("Janus 问题报告： " + (uplink ? "sending" : "receiving") +
					   		" packets on mid " + mid + " (" + lost + " lost packets)");
					   },
				        onmessage: function(msg, jsep) {
							console.log("msg",msg)
							//msg 交互信息包括挂断 接听等事件监听
							// jsep  协商信令
							that.onMessageForVideoRoom(msg,jsep)
				        },
				        onlocaltrack: function(track, added) {
				            console.log("本地媒体",track,added)
							//这里监听到的是本地发布后的所有媒体 注意多流
				            if(added===true){
				            	that.setDomVideoTrick("localDomId",track)
				            }
							
				        },
				        onremotetrack: function(track, mid, added) {
				           
				        },
				        oncleanup: function() {
				            // PeerConnection 关闭监听
				            // 同时可以创建新的句柄(旧的可用)重新初始化
				        },
				        detached: function() {
				             // PeerConnection 关闭监听
				            // 同时可以创建新的句柄（旧的不可用）重新初始化
				        }
				    });
			},
			localPubDomPush(id,display){
				let res = this.publisherList.filter(e => e.id === id )
				if(res.length === 0){
					this.publisherList.push({
						id:id,
						display:display
					})
				}
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
			},
			onMessageForVideoRoom(msg,jsep){
				const that = this
				const event = msg["videoroom"]
				if(jsep) {
				  //设置远程应答描述
				  videoRoomPluginHandle.handleRemoteJsep({ jsep: jsep })
				}
				switch (event){
				  case 'joined':	
					that.private_id = msg['private_id']
					that.publisherStream()
				    //媒体发布者
				    if(msg["publishers"]) {//新加入房间获取媒体发布者
				      const list = msg["publishers"];
				      for(let u in list) {
							let publisher = list[u]
							that.localPubDomPush(publisher["id"],publisher["display"])
							that.streamMap.set(publisher["id"],publisher)
							that.subscriberMedia(publisher)
				      }
				    }
				    break
				  case 'talking':
					that.$message.success(msg['id']+"正在讲话")
					break;
				  case 'event':
				    if(msg['unpublished']){
				      console.log('用户'+msg['unpublished']+'停止发布流')
				    }else if(msg['leaving']){
				      if(msg['reason'] && msg['reason'] === 'kicked'){
				        console.log('您已被踢出房间')
				        this.streamMap = new Map()
				      }else if(!msg['reason']) {
				        that.streamMap.delete(msg['leaving'])
				        console.log('用户'+msg['leaving']+'主动离开房间'+msg['room'])
				      }
				    }else if(msg['moderation'] && msg['moderation'] === 'muted' ){
				      console.log('用户'+msg['id']+' 已被禁言')
				    }else if(msg['publishers']){//已在房间用户监听到媒体变更
				      const list = msg["publishers"];
				      for(let u in list) {
				        let publisher = list[u]
						that.localPubDomPush(publisher["id"],publisher["display"])
				        that.streamMap.set(publisher["id"],publisher)
				        that.subscriberMedia(publisher)
				      }
				    }else if(msg['error_code']){
				        if(msg['error_code'] === 426){
				          
				        }
				    }
				    break
				  default:
				    break
				}
			},
			/**
			 * 订阅当前房间媒体流
			 * @param user (publisher 媒体发布者)(id,display,audio,video)
			 */
			subscriberMedia(user){
			  console.log("订阅用户信息",user)
			  const that = this;
			  var publisherPlugin = null
			  var subscription = [];
			  janus.attach({
			    plugin: "janus.plugin.videoroom",
			    success: function(pluginHandle) {
			      publisherPlugin = pluginHandle
				  let streams = user['streams']
				  for(var i in streams) {
				  	var stream = streams[i];
				  	// If the publisher is VP8/VP9 and this is an older Safari, let's avoid video
				  	if(stream.type === "video" && Janus.webRTCAdapter.browserDetails.browser === "safari" &&
				  			(stream.codec === "vp9" || (stream.codec === "vp8" && !Janus.safariVp8))) {
				  		console.warn("Publisher is using " + stream.codec.toUpperCase +
				  			", but Safari doesn't support it: disabling video stream #" + stream.mindex);
				  		continue;
				  	}
				  	subscription.push({
				  		feed: user['id'],
						mid: stream.mid	 //这里是可选项 如果不填则默认获取所有的流
				  	});
				  	publisherPlugin.rfid = user['id'];
				  	publisherPlugin.rfdisplay = user.display;
				  }
			      var subscribe = {
			        request: "join",
					use_msid:false,//订阅是否应包含引用发布者的 msid；默认为 false
			        room: that.roomNumber,
					autoupdate:true,//离开房间是否自动发送sdp
			        ptype: "subscriber",
			        streams: subscription,//新版本API指定流订阅
			        private_id: that.private_id,//Janus分配的用户ID 可选 除非房间配置一定要
			      };
			      publisherPlugin.send({ message: subscribe });
			    },
			    error: function(error) {
			      console.error("插件加载异常", error);
			    },
			    consentDialog: function(on) {
			
			    },
			    onmessage: function(msg, jsep) {
			      console.log("订阅媒体发布者消息监听：",msg,jsep)
			      const event = msg["videoroom"];
			      if(jsep) {
			        // Answer and attach
			        publisherPlugin.createAnswer(
			          {
			            jsep: jsep,
			            tracks: [
			            	{ type: 'data' }
			            ],
			            success: function(jsep) {
			              Janus.debug("Got SDP!",jsep);
			              var body = { request: "start", room: that.roomNumber };
			              publisherPlugin.send({ message: body, jsep: jsep });
			            },
			            error: function(error) {
			              Janus.error("WebRTC error:", error);
			            }
			          });
			      }
			      switch (event){
			        case 'attached':
			          console.log('订阅用户：'+user['display']+' 媒体信息成功')
			          break
			        default:
			          break
			      }
			    },
			    onlocaltrack: function(track, added) {
			      console.log('publisherOperator#onlocaltrack=> ',track, added)
				  
			    },
			    onremotetrack: function(track, mid, added) {
			      // The publisher stream is sendonly, we don't expect anything here
			      let obj = {
			        track:track,
			        mid: mid,
			        added: added,
			        userId: user['id'],
			        display: user['display'],
			        trackKind: track['kind']
			      }
			      console.log("订阅媒体流变更信息 ：",obj)
				  let mediaDomId = user['id']+'-video'
				  if(mid == '3' && added){
					  //谨记 这里我仅仅提供展示多个流的思路 自己的业务上有多个流具体更具业务容器定义
					  that.setDomVideoTrick('multiStream',track)
					  return 
				  }
				  if(added){
					  that.setDomVideoTrick(mediaDomId,track)
				  }
	
				  //如果false 则标识移除视频流
				  if(!added){
					  let video = document.getElementById(user['id'])
					  if(video){
					  	video.parentNode.removeChild(video)
					  }
				  }
			    },
			    oncleanup: function() {
			      console.log(" ::: Got a cleanup notification: we are unpublished now :::");
			    }
			  });
			},
			createRoom(){
				if(!this.roomNumber){
					this.messageNotify("请填写数字房间号")
					return
				}
				this.createJanusRoom(this.roomNumber,20,500,null,"测试房间")
			},
			createJanusRoom(roomId,roomUserCount,bitrate,pin,desc){
			  const that = this;
			  let create = {
			    request : 'create',
			    room: parseInt(roomId),
			    bitrate: bitrate ? parseInt(bitrate)*1000: 300*1000,
			    publishers: roomUserCount? parseInt(roomUserCount) : 12,//参与人数
			    description:desc,
			    record : false,//（是否要录制这个房间，默认=false）
			    rec_dir : "/home/janus-gateway/record/", //<文件夹应存储录音，启用时>
			    permanent:false,//是否持久化
			    audiolevel_event:false, //向其他用户发送事件
			    audio_active_packets:20 ,//音频级别的数据包数量，默认=100，2秒
				// audiolevel_event:true,
				// audiolevel_ext:true,
			  }
			  if(pin){
			    create.pin = pin; //加入房间所需的密码
			    create.secret = pin;//编辑/销毁房间所需的密码
			  }
			  videoRoomPluginHandle.send({
			    "message" : create,
			    success: function(result) {
			      console.log("创建房间",result)
			    }
			  })
			},
			joinRoom(){
				const that = this
				if(!this.roomNumber || !this.username){
					this.messageNotify("必要参数不能为空")
					return 
				}
				const join = {
				  request: "join",
				  room: parseInt(this.roomNumber),
				  // pin: "123",
				  id: parseInt(this.userId),
				  ptype: "publisher",
				  display: this.username
				};
				videoRoomPluginHandle.send({
				  'message':join,
				  success: function (res) {
				    console.log("正在加入会议室："+that.roomNumber+" 用户: "+that.username)
				  },
				  error: function (err){
				    console.log("加入过程中出错",err)
				  }
				})
				
			},
			publisherStream(){
			  const that = this
			  //send offer
			  videoRoomPluginHandle.createOffer({
				  tracks: [
					  { type: 'audio', capture: true, recv: false },
					  { type: 'video', capture: true, recv: false },
					  { type: 'data' },
				  ],
				  success: function(jsep) {
				    console.log("发布者 SDP!", jsep);
				    const publish = { request: "configure", audio: true, video: true,restart:true}
				    videoRoomPluginHandle.send({ message: publish, jsep: jsep });
				  },
				  error: function(error) {
				    console.error("WebRTC error:", error);
				  }
			  })
			},
			getRoomUserList(){
				const that = this
			  videoRoomPluginHandle.send({
			    "message" : {
			      request : 'listparticipants',
			      room: this.roomNumber,
			    },
			    success: function(result) {
			      // console.log(result)
				  that.userList = result.participants;
			    }
			  })
			},
			hangup(){
				videoRoomPluginHandle.hangup()
				this.clearMedia()
			},
			clearMedia(){
				let local = document.getElementById('localDomId')
				if(local && local.srcObject){
					local.srcObject.getTracks().forEach(e => {
						e.stop()
					})
					local.srcObject = null
				}
				window.location.reload()
			},
			kickOut(row){
				videoRoomPluginHandle.send({
				  "message" : {
				    request : 'kick',
				    room: this.roomNumber,
				    id: row.id
				  },
				  success: function(result) {
				    console.log(result)
				  }
				})
			},
			closeMic(row,b){
				const that = this
				videoRoomPluginHandle.send({
				  'message': {
				    request: "moderate",
				    // secret: "",
				    room : that.roomNumber,
				    id : row.id,
				    mid: '0',
				    mute : b
				  },
				  success: function (res){
				    console.log(res)
					
				  },
				  error: function (err){
				    console.log(err)
				  }
				})
			},
			record(){
				videoRoomPluginHandle.send({ message:
					{ request: "set", record: true,filename:'/home/janus-gateway/record/'+this.username+'-'+this.targetUserName, },
				});
			},
			//视频控制
			controlVideo(){
				this.videoStatus = !this.videoStatus
				if(this.videoStatus){
					videoRoomPluginHandle.unmuteVideo()
				}else{
					videoRoomPluginHandle.muteVideo()
				}
			},
			//音频控制
			controlAudio(){
				this.audioStatus = !this.audioStatus
				if(this.audioStatus){
					videoRoomPluginHandle.unmuteAudio()
				}else{
					videoRoomPluginHandle.muteAudio()
				}
				
			},
			getBitrate(){
				if(videoRoomPluginHandle){
					console.log(videoRoomPluginHandle.getBitrate())
				}	
			},
			messageNotify(msg){
				 this.$notify({
					  title: '温馨提示',
					  message: msg,
					  type: 'warning'
				});
			},
			async startShareScreen(){
				this.shareStreamTag = true
				videoRoomPluginHandle.createOffer({
				        tracks: [{ type: 'screen', add: true, capture: true }],
				        success: function(jsep) {
				            videoRoomPluginHandle.send({ message: { request: "configure",video: true }, jsep: jsep })
				        },
				        error: function(error) {
				            console.log('WebRTC error... ' + error.message);
				        }
				});

			},
			rtpForward(){
				let params = {
							"request" : "rtp_forward",
							"room" : this.roomNumber,
							"publisher_id" : this.userId,
							"host" : "192.168.101.99",
							"host_family" : "ipv4",
							"streams" : [
									{
											"mid" : "1",
											"ssrc":12121,
											"port":8000,// 一定是 远端 UDP流接收端口
									}
							],
					}
					videoRoomPluginHandle.send({
					  "message" : params,
					  success: function(result) {
					    console.log("RTP转发",result)
					  }
					})
			},
			

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