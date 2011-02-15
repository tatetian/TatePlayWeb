/*
 * init elements on load event  
 * */
$(document).ready(function(){
	// add event handlers to controls
	addEventHandlerToControls() ;
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

function addEventHandlerToControls() {
	//alert($(".c"))
	$(".control").hover(function() {//enter
		$(this).css("opacity","1.0") ;
		$(this).css("filter", "alpha(opacity=100)") ;
		$(this).css("cursor","pointer");
	}, function() {//leave
		$(this).css("opacity","0.5") ;
		$(this).css("filter", "alpha(opacity=50)") ;
		$(this).css("cursor","auto");
	}) ;
	$("#zoom-in").click(function() {
		zoom(zoom_factor+0.1) ;
	}) ;
}

function zoom(factor) {
	
}

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
