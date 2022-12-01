<template>
	<div style="width: 95%;height: 80vh;margin-top: 30px;">
		<el-row :gutter="20">
			<el-col :span="24">
				<el-form :inline="true" :model="formInline" class="demo-form-inline">
				  <el-form-item>
				    <el-button type="primary" @click="onSubmit">点击获取当前屏幕分享</el-button>
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
	    console.error('navigator.MediaDevices error: ', error.message, error.name);
	}
	
	export default {
		name:'demo02',
		data(){
			return{
				
				formInline:{
				
				}
			}
		},
		created() {
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

				let newStream = await this.getShareMedia()
				video.srcObject =newStream
				video.muted = true
				
			},
			
			/**
			 * 获取屏幕分享的媒体流
			 * @author suke
			 * @returns {Promise<void>}
			 */
			async getShareMedia(){
			    const constraints = {
			        video:{width:1920,height:1080},
					audio:false
			    };
			    if (window.stream) {
			        window.stream.getTracks().forEach(track => {
			            track.stop();
			        });
			    }
			    return await navigator.mediaDevices.getDisplayMedia(constraints).catch(handleError);
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