(function () {
	'use strict';

	var appModule = angular.module('application', [
			'ui.router',
			'ngAnimate',
			'ui.bootstrap',
			'LocalStorageModule',
			'youtube-embed',
			'ngYoutubeEmbed',
			'ngSanitize',
			//'$window',

			//foundation
			'foundation',
			'foundation.dynamicRouting',
			'foundation.dynamicRouting.animations'
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

	appModule.controller('mainController', ['$scope', '$http', '$timeout', '$interval', '$location', '$window', 'localStorageService', 'FoundationApi', '$sce', function ($scope, $http, $timeout, $interval, $location, $window, localStorageService, FoundationApi, $sce) {

	/*------------------------------------------------------------------------------------------------------------------
	 * BEGIN Set some global/scope variables
	 * ---------------------------------------------------------------------------------------------------------------*/
		$scope.streamVideoId = 'fFppH4_sXBc';

		/* angular youtube embed */
		$scope.ytParams = {
			autoplay: 1
		};
		$scope.player = {
			video: $scope.streamVideoId,
			vars: $scope.ytParams,
			change: function (videoId) {
				$scope.player.video = videoId;
			}
		};

		$scope.playerWidth = 768;
		$scope.playerWidthUnit = "px";
		$scope.playerHeight = 432;
		$scope.playerHeightUnit = "px";
		$scope.chatHeight = $scope.playerHeight;
		$scope.chatHeightUnit = "px";
		$scope.chatWidth = 300;
		$scope.chatWidthUnit = "px";
		/* angular youtube embed */

		$scope.searchText = "";
		/* ng youtube embed */
		$scope.video =  new function() {
			this.domain = 'https://www.youtube.com/watch?v=';
			this.id = 'fFppH4_sXBc';
			this.url = this.domain + this.id;
			this.autoplay = true;
			this.width = 768;
			this.widthUnit = 'px';
			this.height = 432;
			this.heightUnit = 'px'
		};
		$scope.chat = new function() {
			this.domain = 'https://www.youtube.com/live_chat?v=';
			this.id = $scope.streamVideoId;
			this.embedDomain = 'embed_domain=' + 'eruyome.github.io';
			this.theme = 'dark_theme=1';
			this.url = this.domain + this.id + '&' + this.embedDomain + '&' + this.theme;
			this.width = 300;
			this.widthUnit = 'px';
			this.height = 432;
			this.heightUnit = 'px'
		};
		/* ng youtube embed */

		$scope.data = [];
		$scope.tickInterval = 300000;
	/*------------------------------------------------------------------------------------------------------------------
	 * END Set some global/scope variables
	 * ---------------------------------------------------------------------------------------------------------------*/

		/* Trust external ressource */
		$scope.trustSrc = function(src) {
			return $sce.trustAsResourceUrl(src);
		};

		/* Get data from youtube api via ajax */
		$scope.getData = function(kind) {
			if (typeof debugKey === 'undefined' || document.location.hostname != "localhost") {
				var key = "AIzaSyDkGP7Qktvas2tkDhNIwHVLwMXvvxys50o";
			}
			else {
				var key = debugKey;
			}

			var domain = "https://www.googleapis.com/youtube/v3/";
			var channelId = "UCQvTDmHza8erxZqDkjQ4bQQ";

			var videoKind = "videos";
			var videoParameter = "?" + "part=snippet" + "&id=" + $scope.video.id + "&key=" + key;
			var getVideoData = domain + videoKind + videoParameter;

			var channelKind = "channels";
			var channelParameter = "?" + "part=snippet" + "&id=" + channelId + "&key=" + key;
			var getChannelData = domain + channelKind + channelParameter;

			var vListKind = "search";
			var vListOrder = "date";
			var vListMaxResults = 50;
			var vListParameter = "?" + "part=snippet" + "&channelId=" + channelId + "&maxResults=" + vListMaxResults + "&order=" + vListOrder + "&key=" + key;
			var getVListData = domain + vListKind + vListParameter;

			if(kind == "channel") {
				var url = getChannelData;
			}
			else if(kind == "video") {
				var url = getVideoData;
			}
			else if(kind == "vList") {
				var url = getVListData;
			}

			$http.get(url).
			success(function(data, status, headers, config) {
				$scope.data[kind] = data.items;
				util.out($scope.data, 'log');
			}).
			error(function(data, status, headers, config) {
			});
		};

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
		$scope.getData("video");
		$scope.getData("vList");
		/* Reload video list data in intervals */
		$interval(function() {reloadVListData();}, $scope.tickInterval);

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


		/*
		$scope.$watch('buildingCharacter', function(newVal, oldVal){
			$scope.data.options.buildingCharacter = $scope.build.character;
		}, true);
		*/

		// write data to localStorage on changes
		$scope.$watch('data', function(newVal, oldVal){
			setLocalStorage('data', $scope.data);
		}, true);

		function setLocalStorage(key, val) {
			return localStorageService.set(key, val);
		}
		function getLocalStorage(key) {
			return localStorageService.get(key);
		}
	}]);

	/* Directives */
	appModule.directive('vlistitem', function () {
		return {
			restrict: 'A',
			templateUrl: 'templates/directives/vlistitem.html',
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
})();
