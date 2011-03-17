/*
 * global variable
 * */
var reader = {
	zoomFactor: 1.00,
	zoomMode: 'normal',	// 3 possible values: normal, fit-width, fit-height
	docId: 0,
	pageNum: 1, // starting from 1, not 0
	pages: 3,
	empty: true,
	selectedArea: undefined,
	selectingPrecision: 8	// text selection precision
} ;

function localPos($container, pageX, pageY) {
	var originPageX = $container.offset().left ;
	var originPageY = $container.offset().top ;
	return {x: pageX - originPageX, y: pageY - originPageY} ;
} ;

/*
 * init elements on load event  
 * */
$(document).ready(function(){
	// load the pdf
	loadPage(reader.docId, reader.pageNum) ;
	// selected area
	$selectedArea= $('<div id="selected_area" style="border:2px #333333 dashed; position:absolute; width:0; height:0;"></div>') ;
	$("#viewport").append($selectedArea) ;
	reader.selectedArea = $selectedArea;
	// add event handlers to controls
	addEventHandlerToControls() ;
	// handle window resize event
	$(window).resize(onWindowResize) ;
	// text selecting event
	$("#viewport-background").mousedown(function(e){e.preventDefault();});
	$("#viewport").mousedown(function(e) {
		var localOriginPos = localPos($(this), e.pageX, e.pageY) ;
		var $selectedArea = reader.selectedArea ;
		$selectedArea.css("left", localOriginPos.x);
		$selectedArea.css("top",localOriginPos.y);
		$selectedArea.show();
		$("#viewport").mousemove(localOriginPos, function(e) {
			var localNowPos = localPos($(this), e.pageX, e.pageY) ;
			var localOriginPos = e.data ;
			var $selectedArea = reader.selectedArea ;
			$selectedArea.width(localNowPos.x - localOriginPos.x);
			$selectedArea.height(localNowPos.y - localOriginPos.y);
		}) ;
	});
	$("#viewport").mouseup(function(e) {
		$(this).unbind("mousemove");
		var $selectedArea = reader.selectedArea ;
		$selectedArea.width(0);
		$selectedArea.height(0);
		$selectedArea.hide();
	}) ;
}) ;

function loadPage(docId, pageNum) {
	if(!reader.empty) {
		// hide viewport
		$("#main").hide();
	}
    // clear up
	$('#viewport-background').attr("src","") ;
	// now the viewport is empty
	reader.empty = true;
	
    // load pdf image
    $("#viewport-background").attr("src", 
    		"/api/pdf_img.php?doc_id="+docId+"&page_num="+pageNum);
    // load pdf data
	$.get("/api/pdf_data.php", {doc_id: docId, page_num:pageNum}, function(data) {		
		var width = data.pages[reader.pageNum-1].pageWidth;
        var height = data.pages[reader.pageNum-1].pageHeight;
        $("#viewport").width(width);
        $("#viewport").height(height);
        $("#main").show(800);
		// reader is no longer empty
		reader.empty = false ;
		// update page id
		reader.pageNum = data.pageNum;
		// zoom
		zoomFactor = reader.zoomFactor ;
		reader.zoomFactor = 1.0 ;
		zoom(zoomFactor) ;
	}, "json") ;
}

function addEventHandlerToControls() {
	$(".control").hover(function() {//enter
		if( ($(this).attr("id") == "next-page" && reader.pageId + 1 == reader.pageNum)	// no next page
		||  ($(this).attr("id") == "pre-page" && reader.pageId == 0)	) // no previous page
			return ;
		
		$(this).css("opacity","1.0") ;
		$(this).css("filter", "alpha(opacity=100)") ;
		$(this).css("cursor","pointer");
	}, function() {//leave
		$(this).css("opacity","0.5") ;
		$(this).css("filter", "alpha(opacity=50)") ;
		$(this).css("cursor","auto");
	}) ;
	$("#zoom-in").click(function() {
		zoom(reader.zoomFactor + 0.1) ;
		reader.zoomMode = "normal" ;
	}) ;
	$("#zoom-out").click(function() {
		zoom(reader.zoomFactor - 0.1) ;
		reader.zoomMode = "normal" ;
	}) ;
	$('#zoom-fit-height').click(function() {
		ratio = parseFloat($('#main').height()) / parseFloat($('#viewport').height()) ;
		zoom(reader.zoomFactor * ratio) ;
		reader.zoomMode = "fit-height" ;
	}) ;
	$('#zoom-fit-width').click(function() {
		ratio = parseFloat($('#main').width()) / parseFloat($('#viewport').width()) ;
		zoom(reader.zoomFactor * ratio) ;
		reader.zoomMode = "fit-width" ;
	}) ;
	$('#next-page').click(function() {
		if( ($(this).attr("id") == "next-page" && reader.pageId + 1 == reader.pageNum) )	// no next page
			return ;
		loadPage(reader.docId, reader.pageId + 1) ;
	}) ;
	$('#pre-page').click(function() {
		if( ($(this).attr("id") == "pre-page" && reader.pageId == 0)	) // no previous page
			return ;
		loadPage(reader.docId, reader.pageId - 1) ;
	}) ;
}


function zoom(newZoomFactor) {
	if (newZoomFactor < 0.01 || newZoomFactor > 100.0) {
		return;
	}
	// zoom ratio
	ratio = newZoomFactor / reader.zoomFactor ;
	// adjust the size of images
	$imgs = $('#viewport img') ;
	zoomElements($imgs, 'width', ratio) ;
	zoomElements($imgs, 'height', ratio) ;
	// adjust the positions of divs
	$divs = $('#viewport div') ;
	zoomElements($divs, 'top', ratio) ;
	zoomElements($divs, 'left', ratio) ;
	// adjust viewport
	$viewport = $('#viewport') ;
	zoomElements($viewport, 'font-size', ratio) ;
	zoomElements($viewport, 'width', ratio) ;
	zoomElements($viewport, 'height', ratio) ;
	keepViewportCenter() ;
	// update zoom factor
	reader.zoomFactor = newZoomFactor ; 
}

function onWindowResize() {
	keepViewportCenter() ;
	keepZoomMode() ;
}

function keepViewportCenter() {
	// put content in the center
	var windowWidth = $(window).width() ;
	var width = $('#viewport').width() ;
	var left = (windowWidth - width) / 2 ;
	$("#viewport").css("left", left) ;
}

function keepZoomMode() {
	// keep fit-width or fit-height after resize
	if(reader.zoomMode=="fit-width")
		$("#zoom-fit-width").trigger("click") ;
	else if(reader.zoomMode=="fit-height")
		$("#zoom-fit-height").trigger("click") ;
}

function zoomElements($elements, propName, ratio) {
	$elements.each(function(){
		$(this).css(propName, parseFloat($(this).css(propName)) * ratio) ;
	}) ;
}
