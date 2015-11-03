var Storage = function(){

};

Storage.prototype.loadFromStorage = function(key){
  var storage = {};
  try{
    storage = JSON.parse(window.localStorage.getItem('__qubitDeliverToolkit')) || {};
    if( storage && storage[key] ){
      return storage[key];
    }
    else {
      return null;
    }
  } catch(e){
    console.error('Cannot initialise storage module.');
  }
};

Storage.prototype.saveToStorage = function(key, obj){
  var storage = {};
  try{
    storage = JSON.parse(window.localStorage.getItem('__qubitDeliverToolkit')) || {};
    storage[key] = obj;
    window.localStorage.setItem('__qubitDeliverToolkit', JSON.stringify(storage));
  } catch(e){
    console.error('Cannot initialise storage module.');
  }
};



module.exports = new Storage();