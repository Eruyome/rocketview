(function () {
	'use strict';

	var appModule = angular.module('application', [
			'ui.router',
			'ngAnimate',
			'ui.bootstrap',
			'LocalStorageModule',
			'youtube-embed',
			'ngYoutubeEmbed',
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

	appModule.controller('mainController', ['$scope', '$http', '$timeout', '$location', '$window', 'localStorageService', function ($scope, $http, $timeout, $location, $window, localStorageService) {

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
			this.embedDomain = 'embed_domain=' + 'www.eruyome.github.io';
			this.theme = 'dark_theme=1';
			this.url = this.domain + this.id + '&' + this.embedDomain + '&' + this.theme;
			this.width = 300;
			this.widthUnit = 'px';
			this.height = 432;
			this.heightUnit = 'px'
		};
		/* ng youtube embed */

		$scope.data = [];

	/*------------------------------------------------------------------------------------------------------------------
	 * END Set some global/scope variables
	 * ---------------------------------------------------------------------------------------------------------------*/
		$scope.getData = function(kind) {
			if (typeof debugDevBuild === 'undefined') {
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
			var vListMaxResults = 30;
			var vListParameter = "?" + "part=snippet" + "&id=" + channelId + "&maxResults=" + vListMaxResults + "&order=" + vListOrder + "&key=" + key;
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
				console.log(data);
				console.log($scope.data);
			}).
			error(function(data, status, headers, config) {
				// log error
				console.log(status);
			});
		};

		$scope.changeVideo = function (videoId) {
			$scope.video.id = videoId;
			$scope.video.url = $scope.video.domain + $scope.video.id;
			$scope.getData("video");
		};

		$scope.getData("video");
		$scope.getData("vList");

		$scope.changePlayerSize = function(newWidth) {
			$scope.playerWidth = newWidth;
			$scope.playerHeight = ((newWidth / 16) * 9);
		};

		jQuery(window).resize(function(){
			$scope.resizeVideoHeight();
		});


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


		/* Helpers */
		$scope.isUndefined = function (e) {
			return typeof e === 'undefined';
		};
		$scope.isEmpty = function (e) {
			return e.length;
		};

		function isEmpty (obj) {
			if (obj === null) {return true;}

			// Assume if it has a length property with a non-zero value
			// that that property is correct.
			if (obj.length > 0)    {return false;}
			if (obj.length === 0)  {return true;}

			// Otherwise, does it have any properties of its own?
			// Note that this doesn't handle
			// toString and valueOf enumeration bugs in IE < 9
			for (var key in obj) {
				if (hasOwnProperty.call(obj, key)) {return false;}
			}
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
})();
