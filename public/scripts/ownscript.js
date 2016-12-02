$(document).ready(function(){
	$( "#tabs" ).tabs();
    
    var tiles = $(".comic_tile,.user_tile");
    $.each(tiles,function(index, value){
   	      $(value).click(function(){
          $(value).find("a")[0].click();
      });
   });
});