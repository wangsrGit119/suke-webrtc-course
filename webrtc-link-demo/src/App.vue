<template>
  <div id="app">
    <router-view/>
  </div>
</template>

<script>
const { io } = require("socket.io-client");
	var supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
function handleError(error) {
    // alert("摄像头无法正常使用，请检查是否占用或缺失")
    console.error('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
}
/**
 * @author suke
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
			})
	        .catch(handleError);
	}
export default {
  name: 'app',
  components: {
    
  },
  data(){
	  return{
		  linkSocket:undefined,
		  userId:99,
		  roomId:1001,
		  
	  }
  },
  created() {
  },
  methods:{
	  
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
 
}
html,body{
	margin: 0;
	padding: 0;
}
</style>
