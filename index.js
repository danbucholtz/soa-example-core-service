var express = require('express');
var http = require('http');
var passport = require('passport');
var redis = require("redis");

var BearerStrategy = require('passport-http-bearer').Strategy;

var userServiceApi = require('soa-example-user-service-api');
var utils = require('soa-example-core-utils');

var app = express();

var redisClient = redis.createClient();

redisClient.on("error", function (err) {
	console.log("Redis Error: " + err);
});

passport.use(new BearerStrategy({}, function(token, done) {
	process.nextTick(function () {

		// store the user in redis to avoid some unnecessary service calls
		redisClient.get(token, function(err, userJson){
			if ( userJson ){
				var userObject = null;
				try{
					userObject = JSON.parse(userJson);

				}
				catch(ex){
				}
				if ( userObject ){
					return done(null, userObject);
				}
				
				// the user was not in redis or was invalid json or something
				// get the user
				userServiceApi.getUserByToken(token).then(function(user){
					if ( !user ){
						return done(null, false, {message: "Unknown access token: " + token});
					}
					// put the user in redis before returning
					var json = JSON.stringify(user);

					redisClient.set(user.accessToken, json);

					return done(null, user);
				});
			}
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
	if ( req.isAuthenticated() ){
		return next();
	}
	passport.authenticate('bearer', { session: false }, function (err, user) {
		if (user) {
			req.user = user;
			return next();
		}
	})(req, res, next);
}


module.exports = {
	createApiServer : createApiServer,
	getExpressApp : getExpressApp,
	ensureAuthenticated: ensureAuthenticated
}