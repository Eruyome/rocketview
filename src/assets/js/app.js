(function () {
	'use strict';

	function getApiKey() {
		var key = '';
		if (document.location.hostname != "localhost") {
			//distribution key
			key = "AIzaSyDkGP7Qktvas2tkDhNIwHVLwMXvvxys50o";
		}
		else if (document.location.hostname == "localhost") {
			//development key
			key = "AIzaSyCETug5rV8Iv1E72KnZcAVWFm2rRwCmrto";
		}
		return key;
	}

	var appModule = angular.module('application', [
			'ui.router',
			'ngAnimate',
			'ui.bootstrap',
			'LocalStorageModule',
			'youtube-embed',
			'ngYoutubeEmbed',
			'ngSanitize',
			//'angular-google-gapi',
			//'$window',

			//foundation
			'foundation',
			'foundation.dynamicRouting',
			'foundation.dynamicRouting.animations',
			'duScroll'
		])
			.config(config)
			.run(run)
		;

	config.$inject = ['$urlRouterProvider', '$locationProvider', 'localStorageServiceProvider'];

	function config($urlProvider, $locationProvider, localStorageServiceProvider) {
		$urlProvider.otherwise('/');

		$locationProvider.html5Mode({
			enabled: false,
			requireBase: false
		});

		$locationProvider.hashPrefix('!');

		localStorageServiceProvider
			.setStorageType('localStorage');
		localStorageServiceProvider
			.setPrefix('rocketview');
	}

	function run() {
		FastClick.attach(document.body);
		/*
		['GAuth', 'GApi', 'GData', '$state', '$rootScope',
			function(GAuth, GApi, GData, $state, $rootScope) {

				$rootScope.gdata = GData;

				var CLIENT = '378650801043-kupfja7u53oi16u60r62o2ln0uribfuf.apps.googleusercontent.com';
				var BASE = 'https://myGoogleAppEngine.appspot.com/_ah/api';
				if($window.location.hostname == 'localhost') {
					BASE = '//localhost:8080/_ah/api';
				} else {
					BASE = 'https://cloud-endpoints-gae.appspot.com/_ah/api';
				}

				//GApi.load('youtube','v3',BASE);
				GApi.load('youtube','v3',BASE);
				//GApi.load('calendar','v3'); // for google api (https://developers.google.com/apis-explorer/)

				GAuth.setClient(CLIENT);
				GAuth.setScope("https://www.googleapis.com/auth/youtube"); // default scope is only https://www.googleapis.com/auth/userinfo.email

				// load the auth api so that it doesn't have to be loaded asynchronously
				// when the user clicks the 'login' button.
				// That would lead to popup blockers blocking the auth window
				GAuth.load();

				// or just call checkAuth, which in turn does load the oauth api.
				// if you do that, GAuth.load(); is unnecessary
				GAuth.checkAuth().then(
					function (user) {
						console.log(user.name + 'is login')
						//$state.go('webapp.home'); // an example of action if it's possible to
						// authenticate user at startup of the application
					},
					function() {
						//$state.go('login');       // an example of action if it's impossible to
						// authenticate user at startup of the application
					}
				);
			}
		]
		*/
	}

	appModule.controller('mainController',
		['$scope', '$http', '$timeout', '$interval', '$location', '$window', 'localStorageService', 'FoundationApi', '$sce', '$httpParamSerializerJQLike', /*'GApi',*/
		function ($scope, $http, $timeout, $interval, $location, $window, localStorageService, FoundationApi, $sce, $httpParamSerializerJQLike /*,GApi*/)
	{

	/*------------------------------------------------------------------------------------------------------------------
	 * BEGIN Set some global/scope variables
	 * ---------------------------------------------------------------------------------------------------------------*/
		$scope.streamVideoId = 'njCDZWTI-xg';
		$scope.channelId = {
			main : 'UCQvTDmHza8erxZqDkjQ4bQQ',
			letsplay : 'UCtSP1OA6jO4quIGLae7Fb4g'
		};
		$scope.searchText = "";
		$scope.currentTitle = $sce.trustAsHtml('<span></span>');

		/* ng youtube embed */
		$scope.video =  new function() {
			this.domain = 'https://www.youtube.com/watch?v=';
			this.id = $scope.streamVideoId;
			this.url = this.domain + this.id;
			this.title = {
				part: '',
				summary: '',
				date : ''
			};
			this.autoplay = true;
			this.width = 768;
			this.height = 432;
		}();
		$scope.chat = new function() {
			this.domain = 'https://www.youtube.com/live_chat?v=';
			this.id = $scope.streamVideoId;
			this.embedDomain = 'embed_domain=' + 'eruyome.github.io';
			this.theme = 'dark_theme=1';
			this.url = this.domain + this.id + '&' + this.embedDomain + '&' + this.theme;
			this.width = 400;
		}();
		/* ng youtube embed */

		$scope.data = [];
		$scope.data.vList = [];
		$scope.data.video = [];
		$scope.data.calendar = [];

		$scope.viewerCount = 0;
		$scope.refreshVideoListDataInterval = 300000;
		$scope.viewerCountInterval = 5000;
		$scope.scheduleCountInterval = 600000;
		$scope.updateStreamTitleCountInterval = 300000;
		
		$scope.options = {
			activeChannel : 'main'	
		};

	/*------------------------------------------------------------------------------------------------------------------
	 * END Set some global/scope variables
	 * ---------------------------------------------------------------------------------------------------------------*/

		$scope.switchChannel = function(){
			if($scope.options.activeChannel == 'main') {
				$scope.options.activeChannel = 'letsplay';
			}
			else {
				$scope.options.activeChannel = 'main';
			}
		};

		/* Trust external resource */
		$scope.trustSrc = function(src) {
			return $sce.trustAsResourceUrl(src);
		};

		/* Construct formatted title */
		function constructCurrentVideoTitle(video){
			var title = '',
				srcTitle = video[0].snippet.title;

			var part = srcTitle.match(/\[.*?\]/g);
			if(!!part) {
				srcTitle = srcTitle.replace(/\[.*?\]/,
					"<span class='part'>"+ part[0] +"</span>").trim();
			}
			else {
				part = srcTitle.match(/( \d{1}\/\d{1} )/g);
				if(!!part) {
					srcTitle = srcTitle.replace(/( \d{1}\/\d{1} )/,
						"<span class='part'>"+ part[0] +"</span>").trim();
				}
			}

			var date = srcTitle.match(/(\d{2}.\d{2}.\d{4})/g);
			if(!!date) {
				srcTitle = srcTitle.replace(/(\d{2}.\d{2}.\d{4})$/,
					"<span class='date'>"+ date +"</span>").trim();
				srcTitle = srcTitle.replace(/\|([^\|]*)$/,'$1').trim();
			}

			return $sce.trustAsHtml(srcTitle);
		}

		/* Get data from youtube api via ajax */
		function sendDataRequest(url, type, channel){
			$http.get(url).
			success(function(data, status, headers, config) {
				if(typeof channel !== 'undefined' && type == 'vList'){
					$scope.data[type][channel] = data.items;
				}
				else if(typeof channel !== 'undefined'){
					getActualVideoData(data.items, 'vList', channel);
				}
				else if(type == 'video') {
					$scope.currentTitle = constructCurrentVideoTitle(data.items);
					$scope.data[type] = data.items;
				}
				else {
					$scope.data[type] = data.items;
				}
				util.out($scope.data, 'log');
			}).
			error(function(data, status, headers, config) {
			});
		}

		/* Use video Id's from channel search and get more detailed video data */
		function getActualVideoData(list, kind, channel) {
			var idList = [];
			angular.forEach(list, function(value,key){
				idList[key] = value.id.videoId;
			});

			var url = "https://www.googleapis.com/youtube/v3/",
				type = "videos?",
			params = {
				part : 'snippet,contentDetails',
				id : idList.join(),
				maxResults: 50,
				order: 'date',
				key : getApiKey()
			};
			sendDataRequest(url + type + $httpParamSerializerJQLike(params), kind, channel);
		}

		$scope.getData = function(kind) {
			var params = {},
				type = '',
				key = getApiKey(),
				url = "https://www.googleapis.com/youtube/v3/";

			if(kind == "channel") {
				type = "channels?";
				params = {
					part : 'snippet',
					id : $scope.channelId.main,
					key : key
				};
				sendDataRequest(url + type + $httpParamSerializerJQLike(params), kind);
			}
			else if(kind == "video") {
				type = "videos?";
				params = {
					part : 'snippet',
					id : $scope.video.id,
					key : key
				};
				sendDataRequest(url + type + $httpParamSerializerJQLike(params), kind);
			}
			else if(kind == "vList") {
				type = "search?";
				angular.forEach($scope.channelId, function(value, vkey){
					params = {
						part : 'snippet',
						channelId : value,
						maxResults: 50,
						order: 'date',
						type : 'video',
						key : key
					};
					sendDataRequest(url + type + $httpParamSerializerJQLike(params), 'tempVList', vkey);
				});
			}
		};

		/* Change Calendar Data */
		function getShowFromSummary(summary){
			summary = summary.replace(/^\[L\]|^\[N\]/g,"");
			var pos = summary.indexOf('|'),
				show = false;

			if (pos > 0) {
				show = summary.substring(0, pos);
			}

			return show;
		}

		function removeShowFromSummary(summary){
			var pos = summary.indexOf('|');

			summary = summary.replace(/^\[L\]|^\[N\]/g,"");
			if (pos > 0) {
				summary = summary.substring(pos-1, summary.length);
				summary = summary.replace(/[|]/,"");
			}

			return summary;
		}

		function getStatusFlagFromSummary(summary){
			var flag = false;
			if (summary.indexOf('[L]') === 0) {
				flag = 'Live';
			}
			else if (summary.indexOf('[N]') === 0) {
				 flag = 'New';
			}

			return flag;
		}

		/* Convert current dateTime to RFC 3339 Timestamp */
		/* http://stackoverflow.com/questions/7244246/generate-an-rfc-3339-timestamp-similar-to-google-tasks-api */
		/**
		 * @return {string}
		 */
		function ISODateString(d){
			function pad(n){return n<10 ? '0'+n : n;}
			var offset = (d.getTimezoneOffset()/60*-1);
			d.setTime(d.getTime() + (offset*60*60*1000));
			var date = d.getUTCFullYear()+'-'
				+ pad(d.getUTCMonth()+1)+'-'
				+ pad(d.getUTCDate())+'T'
				+ pad(d.getUTCHours())+':'
				+ pad(d.getUTCMinutes())+':'
				+ pad(d.getUTCSeconds())+'+'
				+ pad(offset)+':00';

			return date;
		}
		function getDateTime() {
			return ISODateString(new Date());
		}
		function isPastEvent(event){
			var t = getDateTime();
			return (event.end.dateTime < t);
		}
		/* subtract X minutes from ISO date time string */
		function changeISODateString(minutes, operator, string){
			var date = new Date(string);

			if (operator == 'add') {
				date.setMinutes(date.getMinutes() + minutes);
			}
			else if (operator == 'subtract') {
				date.setMinutes(date.getMinutes() - minutes);
			}

			return ISODateString(date);
		}

		/* Remove X past Events from the list to remove clutter */
		function removePastEvents(list, limit){
			var count = 0;

			angular.forEach(list, function(value, key){
				if(value.isPastEvent) {
					count++;
				}
			});

			if (count > limit) {
				var n = count - limit;
				for(var i = 0; i < n; i++) {
					list.shift();
				}
			}
			list[0].isFirstEventOfTheDay = true;
			return list;
		}

		/* Check if Event is the first of the day */
		function isFirstEventOfTheDay(list, index){
			if(index === 0){
				return true;
			}
			else {
				var date1 = new Date(list[index].start.dateTime).setHours(0,0,0,0),
					date2 = new Date(list[index-1].start.dateTime).setHours(0,0,0,0);

				if(date1 > date2) {
					return true;
				}
			}
		}

		/* Get Calendar Data */
		$scope.getCalendarData = function() {
			var domain = 'https://www.googleapis.com/calendar/v3/calendars/',
				id = 'h6tfehdpu3jrbcrn9sdju9ohj8%40group.calendar.google.com',
				kind = '/events?',
				url = domain + id + kind;

			var params = {
				orderBy : 'startTime',
				singleEvents : 'true',
				timeMin : changeISODateString(240, 'subtract', getDateTime()),
				timeMax : changeISODateString(1440, 'add', getDateTime()),
				key : getApiKey()
			};

			$http.get(url + $httpParamSerializerJQLike(params)).
			success(function(data, status, headers, config) {
				var items = [];
				angular.forEach(data.items, function(value, key){
					var obj = {};
					obj.id = value.id;
					obj.status = value.status;
					obj.start = value.start;
					obj.end = value.end;
					obj.sequence = value.sequence;
					obj.eventStatus = getStatusFlagFromSummary(value.summary);
					obj.show = getShowFromSummary(value.summary);
					obj.summary = removeShowFromSummary(value.summary);
					obj.isPastEvent = isPastEvent(value);
					obj.isFirstEventOfTheDay = isFirstEventOfTheDay(data.items, key);

					items.push(obj);
				});

				$scope.data.calendar = removePastEvents(items, 2);
				util.out('Requested Calendar Data', 'info');
				util.out($scope.data, 'log');
			}).
			error(function(data, status, headers, config) {
			});
		};

		function updateSchedule(){
			$scope.getCalendarData();
		}
		$interval(function() {updateSchedule();}, $scope.scheduleCountInterval);

		function updateStreamTitle(){
			if($scope.video.id != $scope.streamVideoId){
				return;
			}
			$scope.getData('video');
		}
		$interval(function() {updateStreamTitle();}, $scope.updateStreamTitleCountInterval);

		/* Gets called to get video list data in intervals */
		function reloadVListData() {
			$scope.getData("vList");
			util.out("Reloaded video list data.", "info");
		}
		/* Replace video in iframe */
		$scope.changeVideo = function (videoId) {
			$scope.video.id = videoId;
			$scope.video.url = $scope.video.domain + $scope.video.id;
			$scope.getData("video");
		};

		/* Init Load Data */
		$scope.getCalendarData();
		$scope.getData("video");
		$scope.getData("vList");
		/* Reload video list data in intervals */
		$interval(function() {reloadVListData();}, $scope.refreshVideoListDataInterval);

		/* Get Viewer Count */
		/* http://stackoverflow.com/questions/33846081/grabbing-the-current-viewer-count-for-youtube-live-streaming */
		function getLiveViewerCount() {
			var url = 'http://www.youtube.com/live_stats?v=' + $scope.video.id;

			$http.get(url).
			success(function(response) {
				$scope.viewerCount = response;
				util.out($scope.viewerCount, 'log');
			}).
			error(function(response) {
				util.out(response, 'log');
				util.out('Getting Viewer Count failed.', 'log');
			});
		}
		//$interval(function() {getLiveViewerCount();}, $scope.viewerCountInterval);

		$scope.checkIfActiveEvent = function(event){
			var t = getDateTime();
			return !!(event.start.dateTime <= t && event.end.dateTime >= t);
		};
		$scope.beginsWith = function(string, match){
			return string.indexOf(match) === 0;
		};
		$scope.isEven = function(value){
			return (value % 2 === 0) ? true : false;
		};

		/* Toggle Chat display */
		$scope.chatState = true;
		$scope.toggleChat = function () {
			if ($scope.chatState === true) {
				jQuery('#chatView').hide();
				$scope.chatState = false;
			} else {
				jQuery('#chatView').show();
				$scope.chatState = true;
			}
		};
		
		
		/* Like/Dislike */
		$scope.vote = function(direction){
			console.log(direction);	
		};
		
		

		function isElementInViewport (el, offset) {

			//special bonus for those using jQuery
			if (typeof jQuery === "function" && el instanceof jQuery) {
				el = el[0];
			}

			var rect = el.getBoundingClientRect();

			return (
				rect.top >= 0 + offset &&
				rect.left >= 0 &&
				rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
				rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
			);
		}

		$scope.scrollToTop = function () {
			var visible = isElementInViewport(jQuery('#videoPlayer'), 50);
			if(!visible){
				angular.element(document.querySelector('#uiview'))
					.duScrollTo(0, 10, 350);
			}
		};
	}]);


/*----------------------------------------------------------------------------------------------------------------------
 * BEGIN Custom Filters
 * --------------------------------------------------------------------------------------------------------------------*/

	appModule.filter("YoutubeDuration", [function(){
		return function (str) {
			var match = str.match(/PT(\d+H)?(\d+M)?(\d+S)?/),
				hours = (parseInt(match[1]) || 0),
				minutes = (parseInt(match[2]) || 0),
				seconds = (parseInt(match[3]) || 0);

			function pad(n){return n<10 ? '0'+n : n;}
			var h = (hours > 0) ? (hours + ':') : '';
			var m = pad(minutes) + ':';
			var s = pad(seconds);

			return h + m + s;
		};
	}]);

	appModule.filter("filterStatusFlag", [function() {
		return function (str) {
			str = str.replace(/^\[L\]|^\[N\]/g,"");
			return str;
		};
	}]);

	appModule.filter("filterShow", [function() {
		return function (str) {
			var pos = str.indexOf('|');
			if (pos > 0) {
				str = str.substring(pos, str.length);
			}
			str = str.replace(/[|]/,"");
			return str;
		};
	}]);

	appModule.filter("keepShow", [function() {
		return function (str) {
			var pos = str.indexOf('|');
			if (pos > 0) {
				str = str.substring(0, pos);
			}
			else {
				str = '';
			}
			return str;
		};
	}]);

	appModule.filter("showStatusFlag", [function() {
		return function (str) {
			if (str.indexOf('[L]') === 0) {
				str = 'Live';
			}
			else if (str.indexOf('[N]') === 0) {
				str = 'New';
			}
			else {
				str = '';
			}
			return str;
		};
	}]);

/*----------------------------------------------------------------------------------------------------------------------
 * END Custom Filters
 * --------------------------------------------------------------------------------------------------------------------*/


/*----------------------------------------------------------------------------------------------------------------------
 * BEGIN Custom Directives
 * --------------------------------------------------------------------------------------------------------------------*/
	appModule.directive('vlistitem', function () {
		return {
			restrict: 'A',
			templateUrl: 'templates/directives/vlistitem.html',
			scope: true,
			replace: true
		};
	});

	appModule.directive('calendaritem', function () {
		return {
			restrict: 'A',
			templateUrl: 'templates/directives/calendaritem.html',
			scope: true,
			replace: true
		};
	});

	appModule.directive('notification', function () {
		return {
			restrict: 'A',
			templateUrl: 'templates/directives/notification.html',
			scope: false,
			replace: true
		};
	});
/*----------------------------------------------------------------------------------------------------------------------
 * END Custom Directives
 * --------------------------------------------------------------------------------------------------------------------*/

})();
