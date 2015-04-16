$('#clearup').click(function() {
  if (window.confirm('确定要删除所有FPS记录吗？')) {
    console.log("oh yes...");
    $.ajax({
      url: '/records',
      method: 'DELETE',
      success: function(data, textStatus, xhr) {
        console.log(data);
        console.log(textStatus);
        console.log(xhr);
        window.alert('所有记录已清空 即将刷新页面');
        location.reload();
      }
    })
  }
});

$('.case-name').click(function(e) {
  var $this = $(this)
    , id = $this.data('id')
    , name = $this.html();

  if (window.confirm('确定要删除' + name + '吗？')) {
    $.ajax({
      url: '/records/' + id,
      method: 'DELETE',
      success: function(data, textStatus, xhr) {
        console.log(data);
        console.log(textStatus);
        console.log(xhr);
        window.alert('删除成功!');
        location.reload();
      }
    })
  };
});
