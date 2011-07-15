/*
 * global variable
 * */
var reader = {
	zoomFactor: 1.00,
	zoomMode: 'normal',	// 3 possible values: normal, fit-width, fit-height
	docId: 0,
	pageNum: 1, // starting from 1, not 0
	pages: 9,
	empty: true,
	selectingBox: undefined,
    selectedArea: undefined,
    selectingEventCount: 0,
	selectingPrecision: 6,	// text selection precision
    lastSelectionTime: new Date().getTime(),
    data: undefined
} ;

function localPos($container, pageX, pageY) {
	var originPageX = $container.offset().left ;
	var originPageY = $container.offset().top ;
	return {x: pageX - originPageX, y: pageY - originPageY} ;
}

function selectWord(blocks, x, y) {
    var position = findWord(blocks, x, y);
    if (!position)
        return;

    var i = position.blockIndex, j = position.lineIndex, k = position.wordIndex;
    var block = blocks[i];
    var line = block.lines[j];
    var q = line.q;
    var l = q[2*k], r = l + q[2*k+1];

    highlightArea({"l":l, "r":r, "t":line.t, "b":line.b});
}

function isPointInRect(x, y, rect) {
    return rect.l <= x && x <= rect.r && 
        rect.t < y && y <= rect.b;
}

function findWord(blocks, x, y) {
    var block;
    var line, lines;
    var l, r;
    var q;
    for(var i = 0; i < blocks.length; ++i) {
        block = blocks[i];
        if ( isPointInRect(x, y, block) ) {
            lines = block.lines;
            for(var j = 0; j < lines.length; ++j) {
                line = lines[j];
                if ( isPointInRect(x, y, line) ) {
                    q = line.q;
                    for(var k = 0; k < q.length/2; ++k) {
                        l = q[2*k]; r = l + q[2*k+1];
                        if ( l <= x && x <= r ) {
                            return {"blockIndex":i, "lineIndex":j, "wordIndex":k}; 
                        }
                    }
                }
            }
            return null;//found nothing
        }
    }
    return null;//found nothing 
}

function selectText(blocks, startX, startY, endX, endY, operationOnSelectedText) {
    var d = reader.selectingPrecision ; 
    var f = reader.zoomFactor;
    // tranform the coordinates according to zoomFactor
    var left = ( ( startX < endX ? startX : endX )  )/  f ;
    var top = ( ( startY < endY ? startY : endY ) ) / f ;
    var right = ( ( startX > endX ? startX : endX ) ) / f ;
    var bottom = ( ( startY > endY ? startY : endY ) )/ f ;

    var block;
    for(var i = 0; i < blocks.length ; ++i) {
        block = blocks[i];
        if (isBlockSelected(block, left, top, right, bottom)) {
            // if it is the first or last line, we want to select
            // more precisely
            var isFirstLine = block.t < top && top < block.b;
            var isLastLine = block.t < bottom && bottom < block.b;
            if(isFirstLine || isLastLine){
                var s = block.s;
                var q = block.q;
                var l, r;
                for (var j = 0; j < q.length; ++j) {
                    l = q[2*j];
                    r = l + q[2*j+1];
                    if ( (isFirstLine && (left < r)) || (isLastLine && (l < right )) ) {
                        operationOnSelectedText({"l":l, "r":r, "t":block.t, "b":block.b});
                    }
                } 
            }
            else {  // otherwise, just select the whole line
                operationOnSelectedText(block) ;
            }
        }
    }
}

function isBlockSelected(block, left, top, right, bottom) {
    var resizedTop = ( 2 * block.t + block.b ) / 3;
    var resizedBottom = ( block.t + 2 * block.b ) / 3;
    if ( ( (left < block.l && block.l < right ) ||
           (left < block.r && block.r < right ) ) &&
         ( (top < resizedTop && resizedTop < bottom ) ||
           (top < resizedBottom && resizedBottom < bottom) ) )
         return true;
    return false;
}

function highlightArea(block) {
    var f = reader.zoomFactor;
    var dx = $("#main").scrollLeft();
    var dy = $("#main").scrollTop();
    $new_highlight_area = $('<div class="selected-area"></div>');
    $new_highlight_area.css('left', block.l * f );
    $new_highlight_area.css('top', block.t * f );
    $new_highlight_area.width((block.r - block.l)*f);
    $new_highlight_area.height((block.b - block.t)*f);
    $('#viewport').append($new_highlight_area);
}

function copyText(block) {
}

/*
 * init elements on load event  
 * */
$(document).ready(function(){
    var box = $("#clipboard-box");
    box.attr("value", "not hi");
    box.focus();
    box.select();
	// load the pdf
	loadPage(reader.docId, reader.pageNum) ;
	// load pdf data
	$.get("/api/pdf_data.php", {}, function(data) {		
        reader.data = data;
        var block = reader.data.pages[0].blocks;
        // now the viewport is empty
	    reader.empty = true;
		var width = data.pages[reader.pageNum-1].pageWidth;
        var height = data.pages[reader.pageNum-1].pageHeight;
        $("#viewport").width(width);
        $("#viewport").height(height);
        $("#main").show(800);
		// reader is no longer empty
		reader.empty = false ;
		// update page id
		// zoom
		zoomFactor = reader.zoomFactor ;
		reader.zoomFactor = 1.0 ;
		zoom(zoomFactor) ;
	}, "json") ;
	// selected area
	$selectingBox= $('<div id="selected_area" style="border:1px #000088 dashed; position:absolute; width:0; height:0;"></div>') ;
	$("#viewport").append($selectingBox) ;
	reader.selectingBox = $selectingBox;
	// add event handlers to controls
	addEventHandlerToControls() ;
	// handle window resize event
	$(window).resize(onWindowResize) ;
	// text selecting event
	$("#viewport-background").mousedown(function(e){e.preventDefault();});
	$("#viewport").mousedown(function(e) {
        if (reader.empty)
            return;

        $(".selected-area").remove();

		var localOriginPos = localPos($(this), e.pageX, e.pageY) ;
		/*var $selectingBox = reader.selectingBox ;
		$selectingBox.css("left", localOriginPos.x);
		$selectingBox.css("top",localOriginPos.y);
		$selectingBox.show();*/

		$("#viewport").mousemove(localOriginPos, function(e) {
            if (reader.empty)
                return;
			var localNowPos = localPos($(this), e.pageX, e.pageY) ;
			var localOriginPos = e.data ;
			/*var $selectingBox = reader.selectingBox ;
			$selectingBox.width(localNowPos.x - localOriginPos.x);
			$selectingBox.height(localNowPos.y - localOriginPos.y);
            $(this).css("cursor", "default");
            */
            //++ reader.selectingEventCount ;
            var now = new Date().getTime();
            if(now - reader.lastSelectionTime > 150) {
               $(".selected-area").remove();
               var blocks = reader.data.pages[reader.pageNum-1].blocks;
               selectText(blocks, localOriginPos.x, localOriginPos.y, localNowPos.x, localNowPos.y, highlightArea) ;
               reader.lastSelectionTime = now;
            }
		}) ;
	});
	$("#viewport").mouseup(function(e) {
        if (reader.empty)
            return;
            
		$(this).css("cursor", "text");
		$(this).unbind("mousemove");
		/*var $selectingBox = reader.selectingBox ;
		$selectingBox.width(0);
		$selectingBox.height(0);
		$selectingBox.hide();*/
	}) ;
    // double click to select a word
    $('#viewport').dblclick(function(e) {
        var localNowPos = localPos($(this), e.pageX, e.pageY);
        var x = localNowPos.x;
        var y = localNowPos.y;
        $('#clipboard-box').attr("value", "("+x+","+y+")");   
        var blocks = reader.data.pages[reader.pageNum-1].blocks;
        selectWord(blocks, x, y );
    }) ;
    var ctrlKey = 16, cKey = 67;
    // keyboard event
    $(document).keydown(function(e) {
        if (e.keyCode == ctrlKey) 
            reader.ctrlDown = true;
        else if(reader.ctrlDown && e.keyCode == cKey) {//copy selected text
            
        }
    }).keyup(function(e) {
        if (e.keyCode == ctrlKey) reader.ctrlDown = false;
    }) ;
}) ;

function loadPage(docId, pageNum) {
	if(!reader.empty) {
		// hide viewport
		$("#main").hide();
	}
    // clear up
	$('#viewport-background').attr("src","") ;

    reader.pageNum = pageNum;    
    // load pdf image
    $("#viewport-background").attr("src", 
    		"/api/pdf_img.php?doc_id="+docId+"&page_num="+pageNum);
    $("#main").show(800);
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
		if( ($(this).attr("id") == "next-page" && reader.pageNum  == reader.pages) )	// no next page
			return ;
		$(".selected-area").remove();
		loadPage(reader.docId, reader.pageNum + 1) ;
	}) ;
	$('#pre-page').click(function() {
		if( ($(this).attr("id") == "pre-page" && reader.pageNum == 1)	) // no previous page
			return ;
		$(".selected-area").remove();
		loadPage(reader.docId, reader.pageNum - 1) ;
	}) ;
}


function zoom(newZoomFactor) {
	if (newZoomFactor < 0.01 || newZoomFactor > 100.0) {
		return;
	}
	// zoom ratio
	ratio = newZoomFactor / reader.zoomFactor ;
	// adjust the positions of divs
	$divs = $('#viewport div') ;
	zoomElements($divs, 'top', ratio) ;
	zoomElements($divs, 'left', ratio) ;
	// adjust viewport
	$viewport = $('#viewport') ;
	zoomElements($viewport, 'width', ratio) ;
	zoomElements($viewport, 'height', ratio) ;
	keepViewportCenter() ;
    // adjust selected text
    $selected = $('.selected-area') ;
    zoomElements($selected, 'width', ratio) ;
    zoomElements($selected, 'height', ratio) ;
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
