$(document).ready(function() {
    manager.init();
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
            var $one_folder = $('<div class="one_folder" folder_id="'+folders[i].id+'"'+
                             (folders[i].id==folder_id? ' style="display:none" ': '')+
                             '>'+folders[i].name+
                             '<span>'+folders[i].total_papers+'</span></div>');
            if(folders[i].id == folder_id) 
                manager.current_folder = folders[i];
            $one_folder.appendTo("#more_folders").click(function(e) {
                e.stopPropagation();
                manager.clicked_folder = $(this).attr("folder_id");
                $("#folder_list").slideToggle(400, function() {
                    manager.switchFolder(manager.clicked_folder);            
                });
            }); 
        }
        $("#folder_name").html(manager.current_folder.name+'<span>'+manager.current_folder.total_papers+'</span>');
        manager.showPapers(manager.current_folder.id, 0);
    },
    showPapers: function(folder, page) {
        var url = "/api/get_paper_list";
        var paras = {"folder": folder};
        $.get(url, paras, function(data) {
            var tbodyhtml = "";
            var papers = data.papers;
            var l = (page+1)*10;
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
