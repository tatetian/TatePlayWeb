$(document).ready(function() {
    manager.init();
    uploader.init();
});
var manager = {
    folders: undefined,
    default_folder_id: "all",
    current_folder: undefined,
    current_page: 0,
    current_total_pages: 0,
    current_total_papers: 0,
    scrollOwner: $.browser.msie || $.browser.mozilla || $.browser.opera ? "html" : "body",
    init: function() {
        manager.initFolder();
        manager.initEventHandler();
    },
    initFolder: function() {
        var url = "/api/get_folder_list";
        $.get(url, {}, function(data) {
            manager.folders = data;
            manager.switchFolder(manager.default_folder_id);
        });
    },
    initEventHandler: function() {
        $("#folder_name").click(function(e){
            $("#folder_list").slideToggle();
            e.stopPropagation();
        });
        $("#pre_page_btn").click(manager.prePage);
        $("#next_page_btn").click(manager.nextPage);
        $("body").click(function() {
            if($("#folder_list").css("display")!="none")
                $("#folder_list").slideToggle();
        });
    },
    switchFolder: function(folder_id) {
        var folders = manager.folders;
        var l = folders.length;
        $("#more_folders").empty();
        for(var i=0; i < l; ++i) {
            var extra_paper = (uploader.uploaded && (folders[i].id=="gpu" || folders[i].id=="all"))? 1 : 0;
            var $one_folder = $('<div class="one_folder" folder_id="'+folders[i].id+'"'+
                             (folders[i].id==folder_id? ' style="display:none" ': '')+
                             '>'+folders[i].name+
                             '<span>'+(folders[i].total_papers+extra_paper)+'</span></div>');
            if(folders[i].id == folder_id) {
                manager.current_folder = folders[i];
            }
            $one_folder.appendTo("#more_folders").click(function(e) {
                e.stopPropagation();
                manager.clicked_folder = $(this).attr("folder_id");
                $("#folder_list").slideToggle(400, function() {
                    manager.switchFolder(manager.clicked_folder);            
                });
            }); 
        }
        var extra_paper = (uploader.uploaded && (manager.current_folder.id=="gpu" || manager.current_folder.id=="all"))? 1 : 0;
        $("#folder_name").html(manager.current_folder.name+'<span>'+(manager.current_folder.total_papers+extra_paper)+'</span>');
        manager.showPapers(manager.current_folder.id, 0);
    },
    showPapers: function(folder, page) {
        var url = "/api/get_paper_list";
        var paras = {"folder": folder};
        $.get(url, paras, function(data) {
            var tbodyhtml = "";
            var papers = data.papers;
            var l = (page+1)*10;

            if ((folder == "all" || folder == "gpu") && 
                uploader.uploaded) {
                papers.unshift(uploader.uploadedPaper);
            }

            if(l > papers.length) 
                l = papers.length;
            for(var i = page*10; i < l; ++i) {
                var paper = papers[i];
                tbodyhtml += '<tr><td width="*" class="title">'+ paper.title+
                             '</td><td width="150px">'+ paper.year +
                             '</td><td width="150px">'+ paper.addedOn +'</td></tr>';
            }
            manager.current_total_pages = Math.ceil(data.total_papers / 10);
            var $tbody = $("#result_table tbody");
            $tbody.fadeOut(function() {
                $tbody.empty();
                $tbody.append($(tbodyhtml));
                $tbody.fadeIn();   
            });
            $("#papers_from_to").html((page*10+1) + " - " + l);
            $("#total_papers").html(data.total_papers+"");

            $("#pre_page_btn")
        }, "json");
    },
    prePage: function() {
        if (manager.current_page > 0) {
            manager.current_page --;
            $(manager.scrollOwner).animate({"scrollTop":0});
            manager.showPapers(manager.current_folder.id, manager.current_page);            
        }
    },
    nextPage: function() {
        if (manager.current_page < manager.current_total_pages - 1) {
            manager.current_page ++;
            $(manager.scrollOwner).animate({"scrollTop":0});
            manager.showPapers(manager.current_folder.id, manager.current_page);            
        }
    }
};
var uploader = {
    droparea: $.browser.msie || $.browser.mozilla || $.browser.opera ? "html" : "body",
    uploadedPaper: {
        "title":"Accelerating SQL Database Operations on a GPU with CUDA",
        "year":"2010",
        "addedOn":"Just Now"
    },
    uploaded: false,
    init: function() {
        uploader.initEventHandler();
    },
    initEventHandler: function() {
        var droparea = $(uploader.droparea)[0];
        var noOpHandler = uploader.noOpHandler;
        droparea.addEventListener("dragenter", noOpHandler, false);
        droparea.addEventListener("dragexit", noOpHandler, false);
        droparea.addEventListener("dragover", noOpHandler, false);
        droparea.addEventListener("drop", uploader.drop, false);

        $("#add_file_btn").mouseenter(function() {
            $("#upload_tip").toggle();
        }).mouseleave(function() {
            $("#upload_tip").toggle();
        });
    },
    noOpHandler: function(e) {
        e.stopPropagation();
        e.preventDefault();
    },
    drop: function(e) {
        uploader.noOpHandler(e);

        var files = e.dataTransfer.files;
        var count = files.length;

        for(var i = 0; i < count; ++i) {
            var file = files[i];
            uploader.upload(file);
        }            
    },
    upload: function(file) {
        var reader = new FileReader();
        reader.onload = function() {};
        reader.readAsBinaryString(file);
        $("#loader_inner").append('<div id="uploading_msg"><div id="uploading_progress"></div><p style="display:block;">Uploading file <em>' + file.name + '</em> <span style="float:right"> 0% </span></p></div> ');
        $("#uploading_progress").animate(
            {"width": "100%"}, 
            {"duration": 2000, 
             "easing": "swing",
             "step": function(now, fx) {
                $("#uploading_msg span").html(now.toFixed(0) + "%");
             },
             "complete": function() {
                uploader.uploaded = true;
                $("#uploading_msg").delay(800).animate(
                    {"top": $("#uploading_msg").height()+"px"}, 
                    function() {
                        $("#uploading_msg").remove();
                        $("#loader_inner").append('<p id="done_upload_msg" style="display:none">Done. File <em>'+file.name+'</em> is ready.</p>');
                        $("#done_upload_msg").fadeIn(800).delay(6000).fadeOut(800, function(){$(this).remove();});
                    }
                );
                manager.switchFolder(manager.current_folder.id);
             }
        });
    }
};
