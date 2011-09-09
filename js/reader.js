/**
 * Entry point
 * */
$(document).ready(function() {
    // Init the preloader
    preloader.onDoneLoad = function() {
        // After resource data loaded, init reader
        reader.init(preloader.data);              
    } ;
    // Run the preloader
    preloader.run();
    // Add event handlers
});
/**
 * Preloader
 *
 * Load all images and data before showing the GUI of reader
 * */
var preloader = {
    items: [], // format of item: {url:"", type:"img"/"ajax", callback:function}
    doneNow: 0,
    data: undefined,
    run: function() {
        //preloader.prepareImageItems();
        preloader.prepareDataItems();

        preloader.loadItems();
    },
    prepareImageItems: function() {
		var everything = $("body").find("*").each(function() {
			var url = "";
			if ($(this).css("background-image") != "none") {
				var url = $(this).css("background-image");
			} else if ($(this).is("img")) {
				var url = $(this).attr("src");
			}
		    	
			url = url.replace("url(\"", "");
			url = url.replace("url(", "");
			url = url.replace("\")", "");
			url = url.replace(")", "");
			
			if (url.length > 0) {
				preloader.items.push({
                    "url": url, 
                    "type": "img", 
                    "callback": preloader.defaultCallback
                });
			}
		});
	},
    prepareDataItems: function() {
        preloader.items.push({
            "url": "/api/pdf_data.php",
            "type": "data",
            "callback": preloader.dataCallback
        });
    },
    loadItems: function() {
        var items = preloader.items;
        var length = items.length;
		
		for (var i = 0; i < length; i++) {
            var item = items[i];
            if(item.type == "img") {
                var imgLoad = $("<img></img>");
                $(imgLoad).attr("src", item.url);
                $(imgLoad).unbind("load");
                $(imgLoad).bind("load", function(){item.callback();});
                $(imgLoad).appendTo($("#items"));
            }
            else if(item.type == "data"){
                $.get(item.url, {}, item.callback, "json"); 
            }
		}
    },
    defaultCallback: function() {
		preloader.doneNow ++;
		preloader.animateLoader();
	},
    dataCallback: function(data) {
        preloader.data = data;

        preloader.defaultCallback();
    },
    animateLoader: function() {
		var perc = 100 * preloader.doneNow / preloader.items.length ;
		if (perc > 99) {
			$("#loadbar").stop().animate({
				width: perc + "%"
			}, 500, "linear", preloader.doneLoad );
		} else {
			$("#loadbar").stop().animate({
				width: perc + "%"
			}, 500, "linear", function() { });
		}
	},
    doneLoad: function() {
        if(preloader.onDoneLoad)
            preloader.onDoneLoad();

        $("#preloader").delay(200).fadeOut(400,function() {
            $("#top-panel").animate({"opacity": 0.5}, 400);
        });
    },
    onDoneLoad: undefined
} ;
/**
 * Reader
 **/
var reader = {
	zoomFactor: 1.00,
	zoomMode: 'normal',	// 3 possible values: normal, fit-width, fit-height
    currentPage: 1, // start from page 1 by default
	/*selectingBox: undefined,
    selectedArea: undefined,
    selectingEventCount: 0,
	selectingPrecision: 6,	// text selection precision
    selectedText: undefined,
    lastSelectionTime: new Date().getTime(),*/
    totalWidth: undefined,
    // To animate the scrollbar of the browser, we have to deal with different browsers
    scrollOwner: $.browser.msie || $.browser.mozilla || $.browser.opera ? "html" : "body",
    init: function(data) {
        // Init variables
        $.extend(reader, data);
        // Spawn placeholder for pages
        var pages = reader.pages;
        var l = pages.length;
        for (var i = 0; i < l; ++i) {
            var $li = $('<li><img class="page-image" unselectable="on" src="/api/content/page-'+(i+1)+'.png"/></li>');
            $li.width(pages[i].pageWidth);
            $li.height(pages[i].pageHeight);
            $li.appendTo($("#page-container"));
            $("img", $li).mousedown(reader.disableDragging);
        }
        // Adjust the width of #page-container
        var totalWidth = 0;
        for (var i = 0; i < l; ++i)  
            totalWidth += pages[i].pageWidth;
        totalWidth += pages[l-1].pageWidth;
        $("#page-container").width(totalWidth);
        // Add event listeners
        $("#viewport").width(pages[0].pageWidth);
        $("#viewport").height(pages[0].pageHeight);
        reader.resize();
        reader.addKeyboardEventHandler();
        $(window).resize(reader.resize);
        $('#next-page').click(reader.nextPage);
        $('#pre-page').click(reader.prePage);
    },
    resize: function() {
//        $("#main-panel").height($(window).height() - $("#top-panel").height()); 
    },
    disableDragging: function(e) {
        if(e.preventDefault) e.preventDefault(); 
    },
    nextPage: function() {
        if( reader.currentPage  == reader.pages.length )	// no next page
            return ;
        var offset = - reader.currentPage * reader.pages[0].pageWidth;
        $("#page-container").stop().animate({"marginLeft": offset});
        reader.scrollTo(0);
        reader.currentPage ++;
    },
    prePage: function() {
        if( reader.currentPage  == 1 )	{// no pre page
            return ;
        }
        var offset = - (reader.currentPage -2) * reader.pages[0].pageWidth;
        reader.scrollTo(0);
        $("#page-container").stop().animate({"marginLeft": offset});
        reader.currentPage --;
    },
    scroll: function(offset) {
        var offsetStr;
        if(offset > 0)
            offsetStr = "+=" + offset + "px";
        else
            offsetStr = "-=" + (-offset) + "px";
        $(reader.scrollOwner).stop().animate({"scrollTop": offsetStr});
    },
    scrollTo: function(yPos) {
        $(reader.scrollOwner).stop().animate({"scrollTop": yPos+"px"});
    },
    addKeyboardEventHandler: function() {
        $(document).keydown(function(e) {
            var ctrlKey = 17, cKey = 67, pgUpKey = 33, pgDnKey = 34;
            var ltKey = 37, rtKey = 39, upKey = 38, dnKey = 40;
            if(e.keyCode == pgUpKey) {
                if($(window).scrollTop() > 0) {
                    var h = $(window).height();
                    reader.scroll(-h);
                }
                else {// already at the top
                    reader.prePage();
                }
                e.preventDefault();
            }
            else if(e.keyCode == pgDnKey) {
                var h = $(window).height();
                if ($(window).scrollTop() + h < $("#viewport").height()) {
                    reader.scroll(h);
                }
                else {// already at the bottom
                   reader.nextPage();
                }
                e.preventDefault();
            }
            else if(e.keyCode == ltKey) {
                if ($("#viewport").width() < $(window).width()) {
                    reader.prePage();
                    e.preventDefault();
                }
            }
            else if(e.keyCode == rtKey) {
                if ($("#viewport").width() < $(window).width()) {
                    reader.nextPage();
                    e.preventDefault();
                }
            }
            else if(e.keyCode == upKey) {
                $(window).scrollTop($(window).scrollTop()-12);
                e.preventDefault();
            }
            else if(e.keyCode == dnKey) {
                $(window).scrollTop($(window).scrollTop()+12);
                e.preventDefault();
            }
        }).keyup(function(e) {
        }) ;
    }
} ;
/**
 * Helper functions
 * */
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

    reader.selectedText = line.s[k]; 
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

function highlightAndCopy(blocks, startPosition, endPosition)
{
    var i1 = startPosition.blockIndex;
    var j1 = startPosition.lineIndex;
    var k1 = startPosition.wordIndex;
    var i2 = endPosition.blockIndex;
    var j2 = endPosition.lineIndex;
    var k2 = endPosition.wordIndex;

    var block, lines, line;
    var p, q, l, r;
    var kk1, kk2;
    
    var text = "";
    for(var i = i1; i <= i2; ++i)
    {
        if (i != i1)
            text += "\n\n";

        block = blocks[i];
        lines = block.lines;
        for(var j = (i == i1? j1 : 0) ; 
            j < (i == i2? j2 + 1: lines.length); ++j)
        {
            if (j != (i ==i1? j1 : 0))
                text += '\n';

            line = lines[j];i
            q = line.q;
            if (q.length < 2)
                continue;
            kk1 = (i == i1 && j == j1? k1 : 0);
            kk2 = (i == i2 && j == j2? k2 : q.length / 2 - 1);
            l = q[2 * kk1];
            p = 2 * kk2;
            r = q[p] + q[p + 1];
            highlightArea({"l":l, "r":r, "t":line.t, "b":line.b});
            for(var k = kk1; k <= kk2; ++k) {
                if (k != kk1)
                    text += " ";
                text += line.s[k];
            }
        }
    }
    reader.selectedText = text;
}

function selectText(blocks, startX, startY, endX, endY, operationOnSelectedText) {
    var d = reader.selectingPrecision ; 
    var f = reader.zoomFactor;
    // tranform the coordinates according to zoomFactor
    var left = ( ( startX < endX ? startX : endX )  )/  f ;
    var top = ( ( startY < endY ? startY : endY ) ) / f ;
    var right = ( ( startX > endX ? startX : endX ) ) / f ;
    var bottom = ( ( startY > endY ? startY : endY ) )/ f ;

    startPosition = findWordRightAfter(blocks, left, top);
    endPosition = findWordRightBefore(blocks, right, bottom);

    if (startPosition == null || endPosition == null)
        return;

    highlightAndCopy(blocks, startPosition, endPosition);
}

function findWordRightAfter(blocks, left, top)
{
    var block;
    var line, lines;
    var l, r;
    var q;
    for(var i = 0; i < blocks.length; ++i) {
        block = blocks[i];
        if ( left <= block.l && top <= block.t )
            return {"blockIndex": i, "lineIndex": 0, "wordIndex": 0};
        else if ( isPointInRect(left, top, block) ) {
            lines = block.lines;
            for(var j = 0; j < lines.length; ++j) {
                line = lines[j];
                if ( left <= line.l && top <= line.b )
                    return {"blockIndex":i, "lineIndex":j, "wordIndex": 0};
                else if ( isPointInRect(left, top, line) ) {
                    q = line.q;
                    for(var k = 0; k < q.length/2; ++k) {
                        l = q[2*k]; r = l + q[2*k+1];
                        if ( left <= r )
                            return {"blockIndex":i, "lineIndex":j, "wordIndex":k}; 
                    }
                }
            }
        }
        else if ( left <= block.l && block.t <= top && top <= block.b) {
            lines = block.lines;
            for(var j = 0; j < lines.length; ++j) {
                line = lines[j];
                if ( top <= line.b )
                    return {"blockIndex":i, "lineIndex":j, "wordIndex": 0};
            }
        }
    }
    return null;//found nothing 
}

function findWordRightBefore(blocks, right, bottom)
{
    var block;
    var line, lines;
    var l, r;
    var q;
    for(var i = blocks.length - 1; i >= 0; --i) {
        block = blocks[i];
        if ( right >= block.r && bottom >= block.b ) {
            l = block.lines.length - 1;
            line = block.lines[l];
            return {"blockIndex": i, 
                    "lineIndex": l, 
                    "wordIndex": line.s.length - 1};
        }
        else if ( isPointInRect(right, bottom, block) ) {
            lines = block.lines;
            for(var j = lines.length - 1; j >= 0; --j) {
                line = lines[j];
                if ( right >= line.r && bottom >= line.t ) {
                    return {"blockIndex":i, "lineIndex":j, "wordIndex": line.s.length-1};
                }
                else if ( isPointInRect(right, bottom, line) ) {
                    q = line.q;
                    for(var k = q.length/2 -1; k >= 0; --k) {
                        l = q[2*k]; r = l + q[2*k+1];
                        if ( right >= l )
                            return {"blockIndex":i, "lineIndex":j, "wordIndex":k}; 
                    }
                }
            }
        }
        else if ( right >= block.r && block.t <= bottom && bottom <= block.b ) {
            lines = block.lines;
            for(var j = lines.length - 1; j >= 0; --j) {
                line = lines[j];
                if ( line.t <= bottom ) 
                    return {"blockIndex":i, "lineIndex":j, "wordIndex": line.s.length-1};
            }
        }
    }
    return null;//found nothing 
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
    $new_highlight_area = $('<div class="selected-area"></div>');
    $new_highlight_area.css('left', block.l * f );
    $new_highlight_area.css('top', block.t * f );
    $new_highlight_area.width((block.r - block.l)*f);
    $new_highlight_area.height((block.b - block.t)*f);
    $('#viewport').append($new_highlight_area);
}

/*
 * init elements on load event  
 * */
/*
$(document).ready(function(){
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
        //$("#viewport-layer").height(height+20);
        // reader is no longer empty
		reader.empty = false ;
		// update page id
		// zoom
		zoomFactor = reader.zoomFactor ;
		reader.zoomFactor = 1.0 ;
		zoom(zoomFactor) ;
        // load the pdf
	    loadPage(reader.docId, 1) ;
        //if($("#viewport-layer").height() > $("#main").height())
        //   $("#next-page").css("right", $.scrollbarWidth());
	}, "json") ;
	// selected area
	$selectingBox= $('<div id="selected_area" style="border:1px #000088 dashed; position:absolute; width:0; height:0;"></div>') ;
	$("#viewport").append($selectingBox) ;
	reader.selectingBox = $selectingBox;
	// add event handlers to controls
	addEventHandlerToControls() ;
	// handle window resize event
	$(window).resize(onWindowResize) ;
    // disable image dragging
	$("#page-image").mousedown(function(e){if(e.preventDefault)e.preventDefault();});
	// text selecting event
	$("#viewport").mousedown(function(e) {
        if (reader.empty)
            return;

        $(".selected-area").remove();

		var localOriginPos = localPos($(this), e.pageX, e.pageY) ;

        $("#viewport").mousemove(localOriginPos, function(e) {
            if (reader.empty)
                return;
			var localNowPos = localPos($(this), e.pageX, e.pageY) ;
			var localOriginPos = e.data ;
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
	}) ;
    // double click to select a word
    $('#viewport').dblclick(function(e) {
        var localNowPos = localPos($(this), e.pageX, e.pageY);
        var x = localNowPos.x;
        var y = localNowPos.y;
        //$('#clipboard-box').attr("value", "("+x+","+y+")");   
        var blocks = reader.data.pages[reader.pageNum-1].blocks;
        selectWord(blocks, x, y );
    }) ;
    // keyboard event
    $(document).keydown(function(e) {
        var ctrlKey = 17, cKey = 67, pgUpKey = 33, pgDnKey = 34;
        if (e.keyCode == ctrlKey) { 
            reader.ctrlDown = true;
            var $box = $('#clipboard-box');
            $box.focus();
            $box.attr('value', reader.selectedText);
            $box.select();
        }
        else if(reader.ctrlDown && e.keyCode == cKey) {//copy selected text
            // For IE
            if (window.clipboardData) {
                window.clipboardData.setData("Text", reader.selectedText);    
            }
        }
        else if(e.keyCode == pgUpKey) {
            scroll(-$("#main").height());
            e.preventDefault();
        }
        else if(e.keyCode == pgDnKey) {
            scroll($("#main").height());
            e.preventDefault();
        }
    }).keyup(function(e) {
        var ctrlKey = 17;
        if (e.keyCode == ctrlKey) reader.ctrlDown = false;
        $(document).focus();
    }) ;
}) ;*/

function loadPage(docId, pageNum) {
	if(!reader.empty) {
		// hide viewport
		//$("#main").hide();
        $('#viewport').hide();
	}
    // clear up
	$('#page-image').attr("src","") ;

    reader.pageNum = pageNum;    
    // load pdf image
    $("#page-image").attr("src", 
    		"/api/pdf_img.php?doc_id="+docId+"&page_num="+pageNum);
    //$("#main").show(800);
    $('#viewport').show(800);
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
