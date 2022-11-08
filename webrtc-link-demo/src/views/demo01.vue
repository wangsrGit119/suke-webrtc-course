<template>
	<div style="width: 100%;height: 100%;">
		<el-row :gutter="20">
			<el-col :span="24">
				<el-form :inline="true" :model="formInline" class="demo-form-inline">
				  <el-form-item label="摄像头">
				    <el-select v-model="formInline.videoId" placeholder="摄像头">
				      <el-option v-for="(item,index) in localDevice.videoIn " :key="index" :label="item.label" :value="item.id"></el-option>
				    </el-select>
				  </el-form-item>
				  <el-form-item label="麦克风">
				    <el-select v-model="formInline.audioInId" placeholder="麦克风">
				      <el-option v-for="(item,index) in localDevice.audioIn " :key="index" :label="item.label" :value="item.id"></el-option>
				    </el-select>
				  </el-form-item>
				  <el-form-item label="听筒">
				    <el-select v-model="formInline.audioOutId" placeholder="听筒">
				      <el-option v-for="(item,index) in localDevice.audioOut " :key="index" :label="item.label" :value="item.id"></el-option>
				    </el-select>
				  </el-form-item>
				  <el-form-item>
				    <el-button type="primary" @click="onSubmit">确定</el-button>
				  </el-form-item>
				</el-form>
			</el-col>
		</el-row>
		<el-row>
			<video id="localdemo01" autoplay controls muted></video>
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
						console.log(trick.getSettings())
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
					console.log("audioIn",localDevice.audioIn)
					console.log("audioOut",localDevice.audioOut)
					console.log("videoIn",localDevice.videoIn)
				})
		        .catch(handleError);
		}
	export default {
		name:'demo01',
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
				}
			}
		},
		created() {
			initInnerLocalDevice()
			this.localDevice = localDevice
		},
		methods:{
			async onSubmit(){
				let domId = "localdemo01"
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

				let newStream = await this.getTargetDeviceMedia(this.formInline.videoId,this.formInline.audioInId)
				video.srcObject =newStream
				video.muted = true
				
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
			

		}
		
	}
</script>

<style scoped>
	#localdemo01{
		width: 500px;
		height: 400px;
		
	}
</style>