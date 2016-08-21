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
			'angular-web-notification',
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
	}

	appModule.controller('mainController',
		['$scope', '$http', '$timeout', '$interval', '$location', '$window', 'localStorageService', 'FoundationApi', '$sce', '$httpParamSerializerJQLike', 'webNotification',
		function ($scope, $http, $timeout, $interval, $location, $window, localStorageService, FoundationApi, $sce, $httpParamSerializerJQLike, webNotification)
	{

	/*------------------------------------------------------------------------------------------------------------------
	 * BEGIN Set some global/scope variables
	 * ---------------------------------------------------------------------------------------------------------------*/
		$scope.defaultStreamId = 'njCDZWTI-xg';
		$scope.streamVideoId = $scope.defaultStreamId;
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
			this.gaming = 'from_gaming=1';
			this.url = this.domain + this.id + '&' + this.embedDomain + '&' + this.theme + '&' + this.gaming;
			this.width = 400;
		}();
		/* ng youtube embed */

		$scope.data = [];
		$scope.data.vList = [];
		$scope.data.video = [];
		$scope.data.calendar = [];
		$scope.data.shows = [];
		$scope.data.views = '';

		$scope.viewerCount = 0;
		$scope.intervals = {
			refreshVideoListData : 300000,
			scheduleCount : 600000,
			updateStreamTitle : 300000,
			viewCount : 30000
		};

		$scope.options = {
			activeChannel : 'main',
			viewReversed : false,
			selectedSteam : '',
			ratio : 'wide',
			showNotifications : true
		};
		$scope.chatState = true;

	/*------------------------------------------------------------------------------------------------------------------
	 * END Set some global/scope variables
	 * ---------------------------------------------------------------------------------------------------------------*/
		/* Get regular expressions for shows from googlesheet */
		$scope.getShows = function() {
			var spreadsheetId = '1-50O3hZnhH23Fkr3oC4RtcegTTVKgLyTkh-DL8vB2nY';
			var url = 'https://spreadsheets.google.com/feeds/list/'+ spreadsheetId +'/2/public/values?alt=json';

			$http.get(url).
			success(function(data) {
				var obj = [],
					reg = {};

				data.feed.entry.forEach(function(value) {
					try {
						reg = new RegExp(value["gsx$regex"].$t, "i");
					} catch(err) {
						reg = null;
					}

					obj.push({ reg: reg, css: value["gsx$css-class"].$t });
				});
				$scope.data.shows = obj;
				util.out($scope.data.shows, 'log');
			}).
			error(function(data, status, headers, config) {
			});
		};
		initData();


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
			var srcTitle = video[0].snippet.title,
				recognizedShows = [];

			// remove multiple whitespaces
			srcTitle = srcTitle.replace(/ +(?= )/g,'');

			// look for shows in video title
			if(!util.isEmpty($scope.data.shows)) {
				$scope.data.shows.forEach(function(value, key){
					var m = getRegexResults(value.reg, srcTitle);
					if(m !== false){
						recognizedShows.push(m.s);

						// find "| " or "- " before and " |" or " -" after matched show and remove it
						if (new RegExp("\\||\\-").test(srcTitle.substr(m.i-2, 2))){
							srcTitle = util.removeAt(srcTitle, m.i - 2, 2);
						}
						if (new RegExp("\\||\\-").test(srcTitle.substr(m.i + m.l, 2))){
							srcTitle = util.removeAt(srcTitle, m.i + m.l, 2);
						}
						srcTitle = srcTitle.replace(m.s, "<strong class='show'>"+ m.s +"</strong>").trim();
					}
				});
			}

			// look for part- and episode numbers
			var partRegex = new RegExp('(\\d+\\/\\d+)|(\\[\\d+(\\/\\d+)?\\])');
			var part = getRegexResults(partRegex, srcTitle);
			if(part !== false) {
				srcTitle = srcTitle.replace(part.s,	"<strong class='part'>"+ part.s +"</strong>").trim();
			}

			// look for date
			var dateRegex = new RegExp('\\d{2}.\\d{2}.\\d{4}');
			var date = getRegexResults(dateRegex, srcTitle);
			if(date !== false) {
				srcTitle = srcTitle.replace(date.s,	"<strong class='date'>"+ date.s +"</strong>").trim();
				srcTitle = srcTitle.replace(/\|([^\|]*)$/,'$1').trim();
			}

			// remove multiple whitespaces
			srcTitle = srcTitle.replace(/ +(?= )/g,'');
			// add recognized shows to current video data, notify user
			if(!util.isEmpty(recognizedShows)){
				$scope.data.video.recognizedShows = recognizedShows;
				if($scope.options.showNotifications){
					showNotification();
				}
			}

			return $sce.trustAsHtml(srcTitle);
		}

		function showNotification(){
			webNotification.showNotification('Video/Show Update:', {
				body: $scope.data.video.recognizedShows.join().replace(',', " | "),
				icon: 'assets/img/notifications/rocketview.png',
				autoClose: 4000 //auto close the notification after 2 seconds (you manually close it via hide function)
			}, function onShow(error, hide) {
				if (error) {
					util.out('Unable to show notification: ' + error.message, 'error');
				} else {
					util.out('Notification Shown.', 'log');

					setTimeout(function hideNotification() {
						util.out('Hiding notification....', 'log');
						hide(); //manually close the notification (or let the autoClose close it)
					}, 5000);
				}
			});
		}

		function getRegexResults(reg, s) {
			if(!reg) {
				return false;
			}
			var m = reg.exec(s);
			if(m){
				var matchedString = s.substring(m.index, m.index + m[0].length);
				return { l : m[0].length, i : m.index, s : matchedString }
			}
			else {
				return false;
			}
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

		/* Get Stream View Count from googlesheet */
		$scope.getViewCount = function() {
			var spreadsheetId = '1YMRe44sXJPXw58QY5zbd9vsynIPUAjbhGiAK6FDiSNM';
			var url = 'https://spreadsheets.google.com/feeds/list/'+ spreadsheetId +'/2/public/values?alt=json';
			$http.get(url).
				success(function(data, status, headers, config) {
					var properties = data.feed.entry[0].content.$t.split(', ');
					var obj = {};
					properties.forEach(function(property) {
						var tup = property.split(':');
						obj[tup[0]] = tup[1];
					});
					$scope.data.views = obj.views;
					util.out($scope.data.views, 'log');
				}).
				error(function(data, status, headers, config) {
				});
		};


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
		$interval(function() {updateSchedule();}, $scope.intervals.scheduleCount);

		function updateStreamTitle(){
			if($scope.video.id != $scope.streamVideoId){
				return;
			}
			$scope.getData('video');
		}
		$interval(function() {updateStreamTitle();}, $scope.intervals.updateStreamTitle);

		function updateViews(){
			$scope.getViewCount();
		}
		$interval(function() {updateViews();}, $scope.intervals.viewCount);

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
		$interval(function() {reloadVListData();}, $scope.intervals.refreshVideoListData);

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
		$scope.toggleChat = function () {
			if ($scope.chatState === true) {
				jQuery('#chatView').hide();
				$scope.chatState = false;
			} else {
				jQuery('#chatView').show();
				$scope.chatState = true;
			}
		};

		/* Switch Player <-> Chat */
		$scope.switchView = function(){
			$scope.options.viewReversed = ($scope.options.viewReversed !== true);
		};
		// Reset Stream
		$scope.resetStream = function(){
			$scope.streamVideoId = $scope.defaultStreamId;
			$scope.options.selectedStream = $scope.defaultStreamId;
			$scope.changeVideo($scope.defaultStreamId);
		};


		/* Like/Dislike */
		$scope.vote = function(direction){
			util.out(direction, 'log');
		};

		/* Load and save localstorage data */
		// write data to localStorage on changes
		function loadData() {
			var d =	getLocalStorage('options');
			if (!util.isEmpty(d)) {
				angular.forEach(d, function(value, key){
					if(typeof value !== 'undefined' || value !== null || value != ''){
						$scope.options[key] = value;
					}
				});
			}
		}

		$scope.$watch('options', function(newVal, oldVal){
			setLocalStorage('options', $scope.options);
		}, true);

		function setLocalStorage(key, val) {
			return localStorageService.set(key, val);
		}
		function getLocalStorage(key) {
			return localStorageService.get(key);
		}


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

		function initData() {
			$scope.getShows();
			loadData();
		}
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

	appModule.directive('options', function () {
		return {
			restrict: 'A',
			templateUrl: 'templates/directives/options.html',
			scope: true,
			replace: true
		};
	});
/*----------------------------------------------------------------------------------------------------------------------
 * END Custom Directives
 * --------------------------------------------------------------------------------------------------------------------*/

})();
