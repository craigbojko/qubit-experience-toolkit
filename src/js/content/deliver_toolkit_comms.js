(function(debug){
	function ToolkitComms(){
		console.log("COMM SCRIPTS LOADED!");
	}

	ToolkitComms.prototype.receiveMessage = function(event){
		var _self = this;
		var type = event.data.type;
		switch(type){
			case('uv_initial_request'):
				console.log("UV REQUEST...");
				comms.uv_request();
				break;

			case('uv_update_request'):
				console.log("UV UPDATE...");
				comms.uv_update();
				break;
			case('ss_creative_request'):
				console.log("CREATIVE ID REQUEST...");
				comms.creative_ids();
				break;
			default: break;
		}
	};

	ToolkitComms.prototype.sendMessage = function(type, data){
		window.postMessage({
			type: type,
			data: data
		},'*');
	};

	ToolkitComms.prototype.uv_request = function(){
		var _self = this;
		if( window.universal_variable ){ //&& window.universal_variable.page && window.universal_variable.qb){
			console.log("UV Initialised");
			comms.sendMessage('uv_initial_response', JSON.stringify(window.universal_variable));
		}
		else{
			console.log("POLLING FOR UV...");
			setTimeout(function(){
				comms.uv_request();
			}, 1000);
		}
	};

	ToolkitComms.prototype.uv_update = function(){
		var _self = this;
		if( window.universal_variable ){ //&& window.universal_variable.page && window.universal_variable.qb){
			console.log("UV QB Change");
			comms.sendMessage('uv_update_response', JSON.stringify(window.universal_variable));
		}
		else{
			console.log("POLLING FOR UV...");
			setTimeout(function(){
				comms.uv_update();
			}, 1000);
		}
	};

	ToolkitComms.prototype.creative_ids = function(){
		var _self = this;
		if( window._qb_ss ){
			console.log("SS CREATIVE IDS");
			comms.sendMessage('ss_creative_response', JSON.stringify(window._qb_ss));
		}
		else{
			console.log("POLLING FOR CREATIVE IDS...");
			setTimeout(function(){
				comms.creative_ids();
			}, 1000);
		}
	};

	ToolkitComms.prototype.init = function(){
		window.addEventListener('message', this.receiveMessage);

		// Enable uv_listener
		window.uv_listener = window.uv_listener || [];
		window.uv_listener.push(["on", "change:qb", this.uv_update]);
	};

	var comms = new ToolkitComms();
	comms.init();
})(true);