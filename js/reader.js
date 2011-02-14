/*
 * init elements on load event  
 * */
$(document).ready(function(){
	// load page content
	// step 1: load css for content
	var $css = $('<link href="/content/content.css" rel="stylesheet" media="all" />') ;
	$("head").append($css) ;
	// step 2: load html for content
	$("#viewport").load("/content/content.html", function() {
		// viewport is horizontally centerred
		centeringViewport() ;
		// handle window resize event
		$(window).resize(function() {
			centeringViewport() ;
		}) ;
		// show viewport
		$(this).show(800) ;
		// this function run only once
		$(this).unbind("ready") ;
	}) ;
}) ;
/*
 * Put viewport horizontally middle
 * */
function centeringViewport() {
	var windowWidth = $(window).width() ;
	var width = $('#viewport img:first').width() ;
	var left = (windowWidth - width) / 2 ;
	$("#viewport").css("left", left) ;
}
