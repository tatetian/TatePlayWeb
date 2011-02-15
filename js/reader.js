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
		onWindowResize() ;
		// handle window resize event
		$(window).resize(onWindowResize) ;
		// show viewport
		$("#main").show(800) ;
		// this function run only once
		//$(this).unbind("load") ;
	}) ;
}) ;

function onWindowResize() {
	// put content in the center
	var windowWidth = $(window).width() ;
	var width = $('#viewport img:first').width() ;
	var left = (windowWidth - width) / 2 ;
	$("#viewport").width(width) ;
	$("#viewport").css("left", left) ;
	// adjust the position of page control
	//$("#next-page")
}
