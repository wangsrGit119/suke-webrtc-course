<template>
	<div style="width: 95%;height: auto;margin-top: 30px;">
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
		<el-row style="width: 100%;">
			<div style="width: 100%;display: flex;flex-direction: row;align-items: center;justify-content: center;">
				<video id="localdemo01" autoplay controls muted></video>
				<canvas id="output_canvas" class="output_canvas" width="500px" height="400px"></canvas>
			</div>
		</el-row>
	</div>
</template>

<script>
	import * as SFS from "@mediapipe/selfie_segmentation";


	var canvasElement ;
	var canvasCtx ;
	var image ;
	var selfieSegmentation = null;
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
						// console.log(trick.getSettings())
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
					// console.log("audioIn",localDevice.audioIn)
					// console.log("audioOut",localDevice.audioOut)
					// console.log("videoIn",localDevice.videoIn)
				})
		        .catch(handleError);
		}
	export default {
		name:'virtualbg',
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
				meimage:require('@/assets/bg.jpg')
			}
		},
		created() {
			this.$notify({
			  title: '温馨提示',
			  type:'warning',
			  message: '请在代码中查看模型静态文件夹：virtualmodel,并将当前文件夹映射到静态可访问地址',
			  duration: 0
			});
			this.$notify({
			  title: '温馨提示',
			  type:'warning',
			  message: '点击确定后没有出现虚拟背景请F12查看控制台，大概率是你虚拟背景模型地址没有映射出来',
			  duration: 0,
			  position: 'bottom-right'
			});
			initInnerLocalDevice()
			this.localDevice = localDevice;


		},
		mounted() {
			this.initVb()
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
				this.virtualBg()

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
			//初始化模型
			initVb(){
				console.log("模型加载初始化")
				canvasElement = document.getElementById('output_canvas');
				canvasCtx = canvasElement.getContext('2d');
				image = new Image();
				image.src = this.meimage
				selfieSegmentation = new SFS.SelfieSegmentation({locateFile: (file) => {
					console.log(file);
					return `http://127.0.0.1:8081/${file}`;//ng  代理模型文件夹
				  // return `https://cdn.jsdelivr.'net/npm/@mediapipe/selfie_segmentation@0.1.1632777926/${file}`;
				}});
				selfieSegmentation.setOptions({
					modelSelection: 1,
					minDetectionConfidence: 0.5,
					minTrackingConfidence: 0.5,
				});
				selfieSegmentation.onResults(this.handleResults);
			},
			//我们自定义的 处理背景的
			handleResults(results) {
				// Prepare the new frame
				canvasCtx.save();
				canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
				canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasElement.width, canvasElement.height);
				// Draw the image as the new background, and the segmented video on top of that
				canvasCtx.globalCompositeOperation = 'source-out';
				canvasCtx.drawImage(image, 0, 0, image.width, image.height, 0, 0, canvasElement.width, canvasElement.height);
				canvasCtx.globalCompositeOperation = 'destination-atop';
				canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
				// Done
				canvasCtx.restore();
			},
			//这个时官网的 我们暂时不用
			onResults(results) {
			  canvasCtx.save();
			  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
			  canvasCtx.drawImage(results.segmentationMask, 0, 0,
			                      canvasElement.width, canvasElement.height);
			  // Only overwrite existing pixels.
			  canvasCtx.globalCompositeOperation = 'source-in';
			  canvasCtx.fillStyle = '#00FF00';
			  canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
			  // Only overwrite missing pixels.
			  canvasCtx.globalCompositeOperation = 'destination-atop';
			  canvasCtx.drawImage(
			      results.image, 0, 0, canvasElement.width, canvasElement.height);
			  canvasCtx.restore();
			},

			/**
			 * 监听触发模型处理
			 */
			async virtualBg(){
				const that = this
				let video = document.getElementById('localdemo01')
				if(this.rfId){
					cancelAnimationFrame(this.rfId)
				}
				video.addEventListener('playing',function(){
					let myvideo = this;
					let lastTime = new Date();
					async function getFrames() {
						const now = myvideo.currentTime;
						if(now > lastTime){
							await selfieSegmentation.send({image: myvideo});
						}
						lastTime = now;
						//无限定时循环 退出记得取消 cancelAnimationFrame()
						that.rfId = requestAnimationFrame(getFrames);
					};
					getFrames()
				})
			}


		}

	}
</script>

<style scoped>
	#localdemo01{
		width: 500px;
		height: 400px;

	}
	#output_canvas{
		background-color: aqua;
	}
</style>
