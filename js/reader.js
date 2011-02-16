/*
 * init elements on load event  
 * */
$(document).ready(function(){
	// add event handlers to controls
	addEventHandlerToControls() ;
	
	// load the pdf
	$.get("/api/pdf.php", {}, function(data) {
		// append the css
		$css = $('<stle media="screen" type="text/css"></style>') ;
		$css.append(data.css) ;
		$('head').append($css) ;
		// append the pdf content
		$viewport = $('#viewport') ; 
		$viewport.append(data.html) ;
		// set viewport size
		$viewport.width(data.width) ;
		$viewport.height(data.height) ;
		// adjust elements
		onWindowResize() ;
		// handle window resize event
		$(window).resize(onWindowResize) ;
		// show viewport
		$("#main").show(800) ;	
	}, "json") ;
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
	var width = $('#viewport').width() ;
	var left = (windowWidth - width) / 2 ;
	$("#viewport").css("left", left) ;
}
