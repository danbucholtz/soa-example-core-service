var express = require('express');
var http = require('http');

var app = express();

var createServer = function(port){
	app.configure(function(){
		app.set('port', port  );
		app.use(express.logger('dev'));
		app.use(express.bodyParser({uploadDir:'./uploads', limit: '50mb'}));
		app.use(express.json({limit: '50mb'}));
		app.use(express.urlencoded({limit: '50mb'}));
		app.use(express.methodOverride());
		app.use(express.cookieParser('asd;lfkajs;ldfkj'));
		app.use(express.session({
			secret: 'banana',
			maxAge  : new Date(Date.now() + 360000000),
			expires : new Date(Date.now() + 360000000)
		}));
		app.set('views', __dirname + '/views');
		app.set('view engine', 'ejs');
		app.engine('html', require('ejs').renderFile);
		app.use(express.static(__dirname + '/public'));
		app.use(app.router);
	});


	http.createServer(app).listen(app.get('port'), function(){
	  console.log('Node is starting up');
	  console.log('Express server listening on port ' + app.get('port'));
	});
};

var getExpressApp = function(){
	return app;
};

module.exports = {
	createServer : createServer,
	getExpressApp : getExpressApp
}