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
		$scope.defaultStreamId = 'mT0TbIqBliw';
		$scope.defaultStreamViews = 0;
		$scope.streamVideoId = $scope.defaultStreamId;
		$scope.channel = {
			main : { id: 'UCQvTDmHza8erxZqDkjQ4bQQ', lastUpdate : '', key : "main", display : "Main" },
			letsplay : { id : 'UCtSP1OA6jO4quIGLae7Fb4g', lastUpdate : '', key : "letsplay", display : "Let's Play" },
			gametwo : { id : 'UCFBapHA35loZ3KZwT_z3BsQ', lastUpdate : '', key : "gametwo", display : "Game Two" }
		};

		$scope.searchText = "";
		$scope.currentTitle = $sce.trustAsHtml('<span></span>');

		/* ng youtube embed */
		$scope.video =  new function() {
			this.domain = 'https://gaming.youtube.com/watch?v=';
			this.id = $scope.streamVideoId;
			this.url = this.domain + this.id;
			this.defaultUrl = 'https://gaming.youtube.com/user/ROCKETBEANSTV/live';
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
			this.domain = 'https://gaming.youtube.com/live_chat?v=';
			this.id = $scope.streamVideoId;
			this.embedDomain = 'embed_domain=' + window.location.hostname;
			this.url = this.domain + this.id + '&' + this.embedDomain  + '&enablejsapi=1';
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
			refreshVideoListData : 60000,
			scheduleCount : 600000,
			updateStreamTitle : 60000,
			viewCount : 30000,
			refreshChat : 1800000
		};

		$scope.options = {
			activeChannel : 'main',
			viewReversed : false,
			selectedSteam : '',
			ratio : 'wide',
			showNotifications : true,
			chatSmall: false,
			isAppMenu: true,
			refreshChat : false
		};

		$scope.channelSelect = new function() {
			this.display = ["Main", "Let's Play", "Game Two"];
			this.options = ["main", "letsplay", "gametwo"];
			this.value = "";
		};
		function setDefaultChannelSelectValue() {
			$scope.channelSelect.options.forEach(function(value, index){
				if (value == $scope.options.activeChannel) {
					$scope.channelSelect.value = $scope.channelSelect.display[index];
				}
			})
		}
		setDefaultChannelSelectValue();

		$scope.chatState = true;
		$scope.reloadLinkTitle = 'Reload List manually. Happens every '
			+ $scope.intervals.refreshVideoListData / ( 1000 * 60 ) + 'min anyway.';
		$scope.switchChannelLinkTitle = 'Switching reloads channel videos if the last reload is older than '
			+ $scope.intervals.refreshVideoListData / ( 1000 * 60 ) + 'min.';
		$scope.refreshTitle = 'List refreshes every minute.';
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
						reg = new RegExp(value.gsx$regex.$t, "i");
					} catch(err) {
						reg = null;
					}

					obj.push({ reg: reg, css: value["gsx$css-class"].$t });
				});
				$scope.data.shows = obj;
				util.out($scope.data.shows, 'log');

				ga('send', 'event', 'Data', 'Update', 'Shows');
			}).
			error(function(data, status, headers, config) {
			});
		};
		initData();

		$scope.switchChannel = function(key){
			$scope.channelSelect.display.forEach(function(value, index){
				if (value == key) {
					key = $scope.channelSelect.options[index];
				}
			});

			if (typeof key === 'undefined') {
				key = 'main';
			}
			$scope.options.activeChannel = key;

			// Update List Data only when the last update is older than vlistData update interval.
			var timeDiff = new Date() - $scope.channel[$scope.options.activeChannel].lastUpdate;
			if(isNaN(Date.parse(timeDiff)) || timeDiff > $scope.intervals.refreshVideoListData ){
				$scope.getData('vList');
			}

			ga('send', 'event', 'UI', 'Switch', 'Channel', $scope.options.activeChannel);

		};

		$scope.switchChannelOld = function(){
			if($scope.options.activeChannel == 'main') {
				$scope.options.activeChannel = 'letsplay';
			}
			else {
				$scope.options.activeChannel = 'main';
			}

			// Update List Data only when the last update is older than vlistData update interval.
			var timeDiff = new Date() - $scope.channel[$scope.options.activeChannel].lastUpdate;
			if(isNaN(Date.parse(timeDiff)) || timeDiff > $scope.intervals.refreshVideoListData ){
				$scope.getData('vList');
			}

			ga('send', 'event', 'UI', 'Switch', 'Channel', $scope.options.activeChannel);
		};

		/* Trust external resource */
		$scope.trustSrc = function(src) {
			return $sce.trustAsResourceUrl(src);
		};

		/* Construct formatted title */
		function constructCurrentVideoTitle(video){
			//var srcTitle = video[0].snippet.title,
			var srcTitle = video.snippet.title,
				recognizedShows = [];

			// remove multiple whitespaces
			srcTitle = srcTitle.replace(/ +(?= )/g,'');

			// look for shows in video title
			if(!util.isEmpty($scope.data.shows)) {
				$scope.data.shows.forEach(function(value, key){
					var m = getRegexResults(value.reg, srcTitle);
					if(m !== false){
						recognizedShows.push({ name: m.s, css: value.css});

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

		if (!Array.prototype.last){
			Array.prototype.last = function(){
				return this[this.length - 1];
			};
		}

		function getNotificationImage(){
			//var show = $scope.data.video.recognizedShows.last();
			var path = 'assets/img/notifications/';
			var show = 'show-' + $scope.data.video.recognizedShows[0].css + '.jpg';
			return path + show;
		}

		function concatShows(shows) {
			var s = '';
			shows.forEach(function(value, key){
				s += value.name + ' ';
			});
			return s;
		}

		function showNotification(){
			if((new Date() - $scope.lastNotify) < 500) {
				return;
			}
			$scope.lastNotify = new Date();

			webNotification.showNotification('Video/Show Update:', {
				body: concatShows($scope.data.video.recognizedShows),
				icon: getNotificationImage(),
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
				return { l : m[0].length, i : m.index, s : matchedString };
			}
			else {
				return false;
			}
		}

		/* Get data from youtube api via ajax */
		function sendDataRequest(url, type, channel){
			if (typeof channel !== 'undefined' && channel != $scope.options.activeChannel){
				return;
			}

			$http.get(url).
			success(function(data, status, headers, config) {
				if(type == 'video') {
					$scope.currentTitle = constructCurrentVideoTitle(data.items);
					$scope.data[type] = data.items;
					ga('send', 'event', 'Data', 'Update', 'Video');
				}
				else {
					$scope.data[type] = data.items;
					ga('send', 'event', 'Data', 'Update', 'Channel');
				}
				util.out($scope.data, 'log');
			}).
			error(function(data, status, headers, config) {
			});
		}

		$scope.getAllLiveStreams = function(init) {
			var spreadsheetId = '1AgutUpMOUtgofzdYeP6Mu2E_WbdY3HJNp7zZbwhdOFE';
			var url = 'https://spreadsheets.google.com/feeds/list/'+ spreadsheetId +'/1/public/values?alt=json';

			$http.get(url).
			success(function(data) {
				var info = data.feed.entry;
				var streams = [];

				info.forEach(function(value, index) {
					var live = value.gsx$livebroadcastcontent.$t.match(/live/i);
					var obj = {};
					if(!live) { return;	}
					else {
						var v = value.gsx$viewers.$t;
						obj.views = parseInt(v.replace (/,/g, ""));
					}
					obj.snippet = {};
					obj.snippet.title = value.gsx$title.$t;
					obj.snippet.liveBroadcastContent = value.gsx$livebroadcastcontent.$t;
					obj.thumb = value.gsx$thumbnail.$t;
					obj.id = value.gsx$videoid.$t;
					obj.publishedAt = value.gsx$publishedat.$t;
					obj.liveChatId = value.gsx$livechatid.$t;
					obj.startTime = value.gsx$starttime.$t;
					obj.updated = value.updated.$t;
					obj.channelId = value.gsx$channelid.$t;

					streams.push(obj);
					if(obj.id == $scope.video.id && $scope.video.title != obj.snippet.title){
						$scope.video.title = obj.snippet.title;
						$scope.currentTitle = constructCurrentVideoTitle(obj);
						$scope.defaultStreamViews = obj.views;
						$scope.data.views = $scope.defaultStreamViews;
					}
				});

				streams.sort(function(a,b) {return (a.views < b.views) ? 1 : ((b.views < a.views) ? -1 : 0);} );

				$scope.defaultStreamId = data.feed.entry[0].gsx$videoid.$t;
				$scope.streamVideoId = $scope.defaultStreamId;
				$scope.streams = streams;

				util.out($scope.streams, 'log');

				if(typeof init !== 'undefined') {
					$scope.changeStream(streams[0]);
					$scope.getData('video');
				}

				ga('send', 'event', 'Data', 'Update', 'Views');
			}).
			error(function(data, status, headers, config) {
			});
		};

		/* Get List of last 50 uploaded videos from both channels (main + letsplay) */
		function getVList(channel, url) {
			var obj = [];
			$http.get(url)
			.success(function(data) {
				var info = data.feed.entry;
				var videos = [];
				info.forEach(function(value, index) {
					var obj = { 'snippet' : {}, 'contentDetails' : {}};
					obj.snippet.title = value.gsx$title.$t;
					obj.snippet.thumbnails = { 'medium' : {} };
					obj.snippet.thumbnails.medium.url = value.gsx$thumbnail.$t;
					obj.id = value.gsx$videoid.$t;
					obj.snippet.channelId = value.gsx$channelid.$t;
					obj.snippet.publishedAt = value.gsx$publishedat.$t;
					obj.snippet.liveBroadcastContent = value.gsx$livebroadcastcontent.$t;
					obj.contentDetails.duration = value.gsx$duration.$t;
					obj.contentDetails.dimension = value.gsx$dimension.$t;
					obj.contentDetails.definition = value.gsx$definition.$t;

					videos.push(obj);
				});

				$scope.data.vList[channel] = videos;
				ga('send', 'event', 'Data', 'Update', 'Video List', channel);
			})
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
					id : $scope.channel.main.id,
					key : key
				};
				sendDataRequest(url + type + $httpParamSerializerJQLike(params), kind);
			}

			else if(kind == "video") {
				$scope.streams.forEach(function(value){
					if(value.id == $scope.video.id) {
						$scope.currentTitle = constructCurrentVideoTitle(value);
						$scope.data.video = value;
					}
					else {
						var arr = [];
						Array.prototype.push.apply(arr, $scope.data.vList.main);
						Array.prototype.push.apply(arr, $scope.data.vList.letsplay);
						Array.prototype.push.apply(arr, $scope.data.vList.gametwo);
						arr.forEach(function(value){
							if(value.id == $scope.video.id) {
								$scope.currentTitle = constructCurrentVideoTitle(value);
								$scope.data.video = value;
							}
						});
					}
				});
			}
			// Get vlist via google sheet
			else if(kind == "vList") {
				var spreadsheetId = '1AgutUpMOUtgofzdYeP6Mu2E_WbdY3HJNp7zZbwhdOFE';
				var urlMain = 'https://spreadsheets.google.com/feeds/list/'+ spreadsheetId +'/2/public/values?alt=json';
				var urlLetsPlay = 'https://spreadsheets.google.com/feeds/list/'+ spreadsheetId +'/3/public/values?alt=json';
				var urlGameTwo = 'https://spreadsheets.google.com/feeds/list/'+ spreadsheetId +'/4/public/values?alt=json';
				var videos = { 'main' : [], 'letsplay' : [] , 'gametwo' : []};

				getVList('main', urlMain);
				getVList('letsplay', urlLetsPlay);
				getVList('gametwo', urlGameTwo);
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

		function removeDuplicateCalendarEntries(items){
			var newArray = [];

			items.forEach(function(item, i) {
				var existsAlready = false;
				newArray.forEach(function(match){
					if (item.start.dateTime == match.start.dateTime && item.summary == match.summary) {
						existsAlready = true;
					}
				});
				if (!existsAlready) {
					newArray.push(item);
				}
			});

			//return items;
			return newArray;
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
					ga('send', 'event', 'Data', 'Update', 'Calendar');
				});

				items = removePastEvents(items, 2);
				$scope.data.calendar = removeDuplicateCalendarEntries(items);
				util.out('Requested Calendar Data', 'info');
				util.out($scope.data, 'log');
			}).
			error(function(data, status, headers, config) {
			});
		};

		function updateSchedule(){
			$scope.getCalendarData();
		}
		updateSchedule();
		$interval(function() {updateSchedule();}, $scope.intervals.scheduleCount);

		function updateStreamInfo(){
			//$scope.getDefaultStreamInfo();
			$scope.getAllLiveStreams();
		}
		updateStreamInfo();
		$interval(function() {updateStreamInfo();}, $scope.intervals.viewCount);

		function autoRefreshChat(){
			if($scope.options.refreshChat) {
				$scope.refreshIframe();
			}
		}
		$interval(function() {autoRefreshChat();}, $scope.intervals.refreshChat);

		// Create and update Clock
		function getTimeFromDate(date) {
			function pad(n){return n<10 ? '0'+n : n;}
			var newDate = new Date();
			var h = pad(newDate.getHours());
			var m = pad(newDate.getMinutes());
			var time = h + ':' + m;

			return time;
		}

		$scope.clock = {
			clock : getTimeFromDate(new Date())
		};
		var updateClock = function () {
			$scope.clock.now = getTimeFromDate(new Date());
		};

		setInterval(function () {
			$scope.$apply(updateClock);
		}, 1000);

		updateClock();

		/* Gets called to get video list data in intervals */
		function reloadVListData() {
			$scope.getData("vList");
			util.out("Reloaded video list data.", "info");
		}
		/* Replace video in iframe */
		$scope.changeVideo = function (videoId) {
			$scope.video.id = videoId;
			$scope.video.url = $scope.video.domain + $scope.video.id;
			$scope.video.defaultUrl = $scope.video.url;
			$scope.getData("video");
		};
		$scope.changeStream = function(item){
			$scope.changeVideo(item.id);
			$scope.scrollToTop();
			$scope.data.views = item.views;
			$scope.chat.id = item.id;
			$scope.chat.url = $scope.chat.domain + $scope.chat.id + '&' + $scope.chat.embedDomain;
		};

		/* Init Load Data */
		$scope.getCalendarData();
		//$scope.getData("video");
		$scope.getAllLiveStreams(true);
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
					if(typeof value !== 'undefined' || value !== null || value !== ''){
						$scope.options[key] = value;
					}
				});
			}

			setDefaultChannelSelectValue();
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
				if($scope.options.isAppMenu) {
					angular.element(document.querySelector('#uiview'))
						.duScrollTo(0, 10, 350);
				}
				else {
					angular.element(document.querySelector('#uiview'))
						.duScrollTo(0, 50, 350);
				}
			}
		};

		$scope.refreshIframe = function(){
			$scope.chat.refresh = true;
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
	
	appModule.directive('disclaimer', function () {
		return {
			restrict: 'A',
			templateUrl: 'templates/directives/disclaimer.html',
			scope: true,
			replace: true
		};
	});

	appModule.directive('menu', function () {
		return {
			restrict: 'A',
			templateUrl: 'templates/directives/menu.html',
			scope: true,
			replace: true
		};
	});

	appModule.directive('refreshable', [function () {
		return {
			restrict: 'A',
			scope: {
				refresh: "=refreshable"
			},
			link: function (scope, element, attr) {
				var refreshMe = function () {
					element.attr('src', element.attr('src'));
				};

				scope.$watch('refresh', function (newVal, oldVal) {
					if (scope.refresh) {
						scope.refresh = false;
						refreshMe();
					}
				});
			}
		};
	}]);
/*----------------------------------------------------------------------------------------------------------------------
 * END Custom Directives
 * --------------------------------------------------------------------------------------------------------------------*/

})();
