<template>
	<el-row class="container" >
		<div class="task-item" >
			<div class="task-item-child"  v-for="item in taskList" :key="item.id" >
			  <el-button @click="changeToTarget(item)" class="task-item-child-button" :icon="item.icon" :style="item.style" circle></el-button>
			  <div @click="changeToTarget(item)" style="display: flex;flex-direction: column;margin-left: 5px;cursor: pointer;">
				<label style="font-weight: bolder;width: 200px;text-align: left;cursor: pointer;">{{item.title}}</label>
				<label style="font-weight: lighter;font-size: 12px;width: 200px;text-align: left;cursor: pointer;">{{item.description}}</label>
			  </div>
			</div>
		  </div>
	</el-row>
</template>

<script>
export default {
  name: 'home',
  components: {
    
  },
  data(){
	  return{
		  taskList:[
			 {id:1,title:"摄像头基础操作",description:"摄像头获取、多个摄像头切换",icon:"el-icon-video-camera",style:"background-image: linear-gradient(to top, #d9afd9 0%, #97d9e1 100%);",uriType:'router',router:"/demo01"},
		  {id:2,title:"屏幕分享",description:"屏幕分享流的获取",icon:"el-icon-video-camera",style:"background-image: linear-gradient(to top, #7028e4 0%, #e5b2ca 100%);",uriType:'router',router:"/demo02"},
		  {id:3,title:"虚拟背景",description:"虚拟背景例子",icon:"el-icon-video-camera",style:"background-image: linear-gradient(to top, #7028e4 0%, #e5b2ca 100%);",uriType:'router',router:"/virtualbg"},
		  {id:4,title:"一对一网络视频",description:"一对一网络视频",icon:"el-icon-video-camera",style:"background-image: linear-gradient(to top, #ff0844 0%, #ffb199 100%);",uriType:'router',router:"/demo03-one2one"},
		  {id:5,title:"小型直播",description:"纯WebRTC小型直播、可切换虚拟背景",icon:"el-icon-video-camera",style:"background-image: linear-gradient(to right, #ff758c 0%, #ff7eb3 100%);",uriType:'router',router:"/demo03-one2many"},
		  {id:6,title:"多对多网络视频",description:"Mesh架构会议系统",icon:"el-icon-video-camera",style:"background-image: linear-gradient(to right, #92fe9d 0%, #00c9ff 100%);",uriType:'router',router:"/demo03-many2many"},
		  {id:7,title:"Janus-01",description:"Janus初步认识，初始化，插件使用；点对点音视频；媒体控制",icon:"el-icon-video-camera",style:"background-image: linear-gradient(to right, #f83600 0%, #f9d423 100%);",uriType:'router',router:"/demo04-janus-01"},
		  {id:8,title:"Janus-02",description:"Janus会议室",icon:"el-icon-video-camera",style:"background-image: linear-gradient(to right, #f83600 0%, #f9d423 100%);",uriType:'router',router:"/demo04-janus-02"},
		  {id:9,title:"FLV播放器",description:"FLV播放器",icon:"el-icon-video-camera",style:"background-image: linear-gradient(to right, #4382f8 0%, #f9d423 100%);",uriType:'router',router:"/flv-player"},
		  {id:10,title:"WebRTC+SRS推流",description:"使用WebRTC给SRS流媒体服务推流",icon:"el-icon-video-camera",style:"background-image: linear-gradient(to right, #4382f8 0%, #20f927 100%);",uriType:'router',router:"/srs-rtc-push"},
		  {id:11,title:"WebRTC+SRS直播",description:"WebRTC+SRS实现低延迟直播",icon:"el-icon-video-camera",style:"background-image: linear-gradient(to right, #859ef8 0%, #e375f9 100%);",uriType:'router',router:"/srs-live-room"},
		  {id:12,title:"WebRTC+SRS会议系统",description:"WebRTC+SRS实现多媒体混合会议",icon:"el-icon-video-camera",style:"background-image: linear-gradient(to right, #859ef8 0%, #f974a9 100%);",uriType:'router',router:"/srs-meeting-room"},
		  {id:13,title:"前端媒体流合并",description:"前端媒体画面合并",icon:"el-icon-video-camera",style:"background-image: linear-gradient(to right, #f84492 0%, #89f9ac 100%);",uriType:'router',router:"/stream-merger-push"},
		  
		  ]
		  
		  
	  }
  },
  created() {
  },
  methods:{
	   changeToTarget(item){
	          if(item.router){
	              if(item.uriType === "url"){
	                  window.open(item.router, "_blank");
	              }else if(item.uriType === "router"){
	                  this.$router.push(item.router)
	              }else {
	                  this.msgError("非法路径")
	              }
	          }else {
	              this.msgError("开发中")
	          }
	      },
	  
  }
}
</script>

<style scoped>
	
	.container{
		background-image: linear-gradient(-225deg, #5D9FFF 0%, #B8DCFF 48%, #6BBBFF 100%);
		
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 99%;
		height: 98vh;
	}
	.task-item{
	  display: flex;
	  display: -webkit-flex; /* Safari */
	  flex-direction: row;
	  flex-wrap: wrap;
	  padding: 20px;
	  justify-content: flex-start;
	}
	.task-item-child{
	  display: flex;
	  /*实现垂直居中*/
	  align-items: center;
	  border: transparent;
	  width:25%;
	  height: 100px;
	}
</style>