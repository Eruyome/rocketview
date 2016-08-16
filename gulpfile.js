// FOUNDATION FOR APPS TEMPLATE GULPFILE
// -------------------------------------
// This file processes all of the assets in the "src" folder, combines them with the Foundation for Apps assets, and outputs the finished files in the "build" folder as a finished app.

// 1. LIBRARIES
// - - - - - - - - - - - - - - -

var $ = require('gulp-load-plugins')();
var argv = require('yargs').argv;
var gulp = require('gulp');
var rimraf = require('rimraf');
var router = require('front-router');
var sequence = require('run-sequence');
var notify = require('gulp-notify');
var jscs = require('gulp-jscs');
var jshint = require('gulp-jshint');
var gitmodified = require('gulp-gitmodified');
var subtree = require('gulp-subtree-only');
var shell = require('gulp-shell');

// Check for --production flag
var isProduction = !!(argv.production);

// 2. FILE PATHS
// - - - - - - - - - - - - - - -

var paths = {
	assets: [
		'./src/**/*.*',
		'!./src/templates/**/*.*',
		'!./src/assets/{scss,js}/**/*.*'
	],
	// Sass will check these folders for files when you use @import.
	sass: [
		'src/assets/scss',
		'bower_components/foundation-apps/scss'
	],
	// These files include Foundation for Apps and its dependencies
	foundationJS: [
		'bower_components/fastclick/lib/fastclick.js',
		'bower_components/viewport-units-buggyfill/viewport-units-buggyfill.js',
		'bower_components/tether/tether.js',
		'bower_components/hammerjs/hammer.js',
		'bower_components/angular/angular.js',
		'node_modules/angular-ui-bootstrap/dist/ui-bootstrap.js',
		'node_modules/angular-local-storage/dist/angular-local-storage.min.js',
		'bower_components/angular-animate/angular-animate.js',
		'bower_components/angular-ui-router/release/angular-ui-router.js',
		'bower_components/foundation-apps/js/vendor/**/*.js',
		'bower_components/foundation-apps/js/angular/**/*.js',
		'!bower_components/foundation-apps/js/angular/app.js',
		'node_modules/angular-youtube-embed/dist/angular-youtube-embed.min.js',
		'node_modules/ng-youtube-embed/build/ng-youtube-embed.min.js'
	],
	// These files are for your app's JavaScript
	appJS: [
		'src/assets/js/util.js',
		(isProduction) ? '' : 'src/assets/js/debug.js',
		'bower_components/jquery/dist/jquery.js',
		'src/assets/js/app.js'
	],
	vendorCSS: [

	]
};

// 3. TASKS
// - - - - - - - - - - - - - - -

// Cleans the build directory
gulp.task('clean', function (cb) {
	rimraf('./dist', cb);
});

// Copies everything in the src folder except templates, Sass, and JS
gulp.task('copy', function () {
	return gulp.src(paths.assets, {
			base: './src/'
		})
		.pipe(gulp.dest('./dist'))
		;
});

// Copies your app's page templates and generates URLs for them
gulp.task('copy:templates', function () {
	return gulp.src('./src/templates/**/*.html')
		.pipe(router({
			path: 'dist/assets/js/routes.js',
			root: 'src'
		}))
		.pipe(gulp.dest('./dist/templates'))
		;
});

// Compiles the Foundation for Apps directive partials into a single JavaScript file
gulp.task('copy:foundation', function (cb) {
	gulp.src('bower_components/foundation-apps/js/angular/components/**/*.html')
		.pipe($.ngHtml2js({
			prefix: 'components/',
			moduleName: 'foundation',
			declareModule: false
		}))
		.pipe($.uglify())
		.pipe($.concat('templates.js'))
		.pipe(gulp.dest('./dist/assets/js'))
	;

	// Iconic SVG icons
	gulp.src('./bower_components/foundation-apps/iconic/**/*')
		.pipe(gulp.dest('./dist/assets/img/iconic/'))
	;

	cb();
});

// Copy images
gulp.task('copy:images', function (cb) {
	// Asset icons
	gulp.src('./src/assets/img/**/*.+(jpg|jpeg|gif|png|svg)')
		.pipe(gulp.dest('./dist/assets/img/'))
	;

	cb();
});

// Compiles Sass
gulp.task('sass', function () {
	var minifyCss = $.if(isProduction, $.minifyCss());

	return gulp.src('src/assets/scss/app.scss')
		.pipe($.sass({
			includePaths: paths.sass,
			outputStyle: (isProduction ? 'compressed' : 'nested'),
			errLogToConsole: true
		}))
		.pipe($.autoprefixer({
			browsers: ['last 2 versions', 'ie 10']
		}))
		.pipe(minifyCss)
		.pipe(gulp.dest('./dist/assets/css/'))
		;
});

// Vendor CSS
gulp.task('css', function() {
	var minifyCss = $.if(isProduction, $.minifyCss());

	return gulp.src(paths.vendorCSS)
		.pipe($.concat('vendor.css'))
		.pipe(minifyCss)
		.pipe(gulp.dest('./dist/assets/css/'));
});

// Compiles and copies the Foundation for Apps JavaScript, as well as your app's custom JS
gulp.task('uglify', ['uglify:foundation', 'uglify:app']);

gulp.task('uglify:foundation', function (cb) {
	var uglify = $.if(isProduction, $.uglify()
		.on('error', function (e) {
			console.log(e);
		}));

	return gulp.src(paths.foundationJS)
		.pipe(uglify)
		.pipe($.concat('foundation.js'))
		.pipe(gulp.dest('./dist/assets/js/'))
		;
});

gulp.task('uglify:app', function () {
	var uglify = $.if(isProduction, $.uglify()
		.on('error', function (e) {
			console.log(e);
		}));

	return gulp.src(paths.appJS)
		.pipe(uglify)
		.pipe($.concat('app.js'))
		.pipe(gulp.dest('./dist/assets/js/'))
		;
});

// js-hint git modified files
gulp.task('lint', function (cb) {
	gulp.src(['./src/assets/js/**/*.js'])
		.pipe(gitmodified('modified'))
		.pipe(jscs())
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'))
		//.pipe(jshint.reporter('fail'))  //uncomment to fail on warning/error
		.pipe(notify({
			title: 'JSHint <%= file.relative %>',
			message: 'jscs/JSHint Passed. Let it fly!'
		}));

	cb();
});

// js-hint all files
gulp.task('lintAll', function (cb) {
	gulp.src(['./src/assets/js/**/*.js'])
		.pipe(jscs())
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'))
		//.pipe(jshint.reporter('fail'))  //uncomment to fail on warning/error
		.pipe(notify({
			title: 'JSHint <%= file.relative %>',
			message: 'jscs/JSHint Passed. Let it fly!'
		}));

	cb();
});

gulp.task('subtree', function () {
	return gulp.src('dist')
		.pipe(subtree());
});

gulp.task('deploy', shell.task([
	'deploy.sh'
]));

// Starts a test server, which you can view at http://localhost:8079
gulp.task('server', ['build'], function () {
	gulp.src('./dist')
		.pipe($.webserver({
			port: 8079,
			host: 'localhost',
			fallback: 'index.html',
			livereload: true,
			open: true
		}))
	;
});

// Builds your entire app once, without starting a server
gulp.task('build', function (cb) {
	sequence('clean', 'lint', ['copy', 'copy:foundation', 'sass', 'uglify'], 'copy:templates', cb);
});

// Default task: builds your app, starts a server, and recompiles assets when they change
gulp.task('default', ['server'], function () {
	// Watch Sass
	gulp.watch(['./src/assets/scss/**/*', './scss/**/*'], ['sass']);

	// Watch JavaScript
	gulp.watch(['./src/assets/js/**/*', './js/**/*'], ['lint', 'uglify:app']);

	// Watch static files
	gulp.watch(['./src/**/*.*', '!./src/templates/**/*.*', '!./src/assets/{scss,js}/**/*.*'], ['copy']);

	// Watch app templates
	gulp.watch(['./src/templates/**/*.html'], ['copy:templates']);

	// Watch Images
	gulp.watch(['./client/assets/img/**/*', './img/**/*.+(jpg|jpeg|gif|png|svg)'], ['copy:images']);
});
