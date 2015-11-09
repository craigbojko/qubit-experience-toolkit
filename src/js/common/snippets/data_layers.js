module.exports = function(){
	var rand = Math.round(Math.random()*10000000000000);
	var e = document.createElement('script');
	e.src = 'https://s3-eu-west-1.amazonaws.com/qubit-etc/bookmarklets/sales/view-data-layers.js?' + rand;
	document.getElementsByTagName('head')[0].appendChild(e);
};