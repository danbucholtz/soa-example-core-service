var express = require('express');
var http = require('http');
var passport = require('passport');
var  BearerStrategy = require('passport-http-bearer').Strategy;

var userServiceApi = require('soa-example-user-service-api');
var utils = require('soa-example-core-utils');

var app = express();

passport.use(new BearerStrategy({}, function(token, done) {
	process.nextTick(function () {
		userServiceApi.getUserByToken(token).then(function(user){
			if ( !user ){
				return done(null, false, {message: "Unknown access token: " + token});
			}
			return done(null, user);
		});
	});
}));


var createApiServer = function(port){
	app.configure(function(){
		app.set('port', port  );
		app.use(passport.initialize());
		app.use(express.logger('dev'));
		app.use(express.bodyParser({uploadDir:'./uploads', limit: '50mb'}));
		app.use(express.json({limit: '50mb'}));
		app.use(express.urlencoded({limit: '50mb'}));
		app.use(express.methodOverride());
		app.use(express.cookieParser('asd;lfkajs;ldfkj'));
		app.use(app.router);
	});


	http.createServer(app).listen(app.get('port'), function(){
	  console.log('Node is starting up');
	  console.log('Express server listening on port ' + app.get('port'));
	});

	return app;
};

var getExpressApp = function(){
	return app;
};

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	else {
		res.statusCode = 401;
		res.send({success:false, errorMessage:"Invalid Access Token"});.
	}
}

module.exports = {
	createApiServer : createApiServer,
	getExpressApp : getExpressApp,
	ensureAuthenticated: ensureAuthenticated
}