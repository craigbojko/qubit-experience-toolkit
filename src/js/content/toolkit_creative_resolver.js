var $ = require('jquery');

var creative_resolver = {

  initialised : false,
  toolkit : null,
  creativeData : {},
  experimentData : {},


  init : function(t){
    if( !t ) return;
    var _self = this;
    this.toolkit = t;

    _self.initialised = true;
  },

  getExperimentAndCreative : function(e_id, callback){
    Promise.all([
      deliverToolkit.modules.creative_resolver.requestExperimentDataById(e_id, callback),
      deliverToolkit.modules.creative_resolver.requestCreativesByEperimentId(e_id, callback)
    ]).then(function(data){
      deliverToolkit.modules.creative_resolver.returnAllData(data, e_id, callback);
    }, function(){
      deliverToolkit.modules.creative_resolver.returnError(e, e_id, callback);
    });
  },

  getExperiment : function(e_id, callback){
    if( this.experimentData && this.experimentData[e_id] ){
      deliverToolkit.modules.creative_resolver.returnCreativeData(this.experimentData[e_id], e_id, callback);
      return this.experimentData.e_id;
    }
    else{
      return this.requestExperimentDataById(e_id)
        .then(function(data){
          deliverToolkit.modules.creative_resolver.returnExperimentData(data, e_id, callback);
        },
        function(e){
          deliverToolkit.modules.creative_resolver.returnError(e, e_id, callback);
        });
    }
  },

  getCreative : function(e_id, callback){
    if( this.creativeData && this.creativeData[e_id] ){
      deliverToolkit.modules.creative_resolver.returnCreativeData(this.creativeData[e_id], e_id, callback);
      return this.creativeData.e_id;
    }
    else{
      return this.requestCreativesByEperimentId(e_id)
        .then(function(data){
          deliverToolkit.modules.creative_resolver.returnCreativeData(data, e_id, callback);
        },
        function(e){
          deliverToolkit.modules.creative_resolver.returnError(e, e_id, callback);
        });
    }
  },

  requestCreativesByEperimentId : function(e_id){
    return new Promise(function(resolve, reject){
      $.ajax({
        url:"https://dashboard.qubitproducts.com/p/"+deliverToolkit.clientId+"/smart_serve/experiments/"+e_id+"/recent_iterations/draft/variations"
      }).done(function(data){
        resolve(data);
      }).fail(function(error){
        reject(error);
      });
    });
  },

  requestExperimentDataById : function(e_id){
    return new Promise(function(resolve, reject){
      $.ajax({
        url:"https://dashboard.qubitproducts.com/p/"+deliverToolkit.clientId+"/smart_serve/experiments/"+e_id
      }).done(function(data){
        resolve(data);
      }).fail(function(error){
        reject(error);
      });
    });
  },

  returnAllData : function(data, experimentId, callback){
    console.log("EXPERIMENT & CREATIVE RESP: ", data);
    // this.creativeData[experimentId] = data;
    callback(data);
  },
  returnCreativeData : function(data, experimentId, callback){
    console.log("CREATIVE RESP: ", data);
    this.creativeData[experimentId] = data;
    callback(data);
  },
  returnExperimentData : function(data, experimentId, callback){
    console.log("EXPERIMENT RESP: ", data);
    this.experimentData[experimentId] = data;
    callback(data);
  },
  returnError : function(error, experimentId, callback){
    console.error("PROMISE FAIL: ", experimentId);
  }
};

module.exports = function(){
  return creative_resolver;
};
