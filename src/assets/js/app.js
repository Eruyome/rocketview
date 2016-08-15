(function () {
	'use strict';

	var appModule = angular.module('application', [
			'ui.router',
			'ngAnimate',
			'ui.bootstrap',
			'LocalStorageModule',
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

		$scope.$watch('buildingCharacter', function(newVal, oldVal){
			$scope.data.options.buildingCharacter = $scope.build.character;
		}, true);

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
	appModule.directive('sheet', function () {
		return {
			restrict: 'A',
			templateUrl: 'templates/directives/sheet.html',
			scope: true
			//,replace: true
		};
	});
})();
