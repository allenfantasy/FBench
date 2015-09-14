$('#clearup').on('click', function(e) {
  if (window.confirm('确定要删除所有FPS记录吗？')) {
    $.ajax({
      url: '/records',
      method: 'DELETE',
      success: function(data, textStatus, xhr) {
        window.alert('所有记录已清空 即将刷新页面');
        location.reload();
      }
    })
  }
});

$('#record-table').on('click', 'td.case-name', function(e) {
  var $this = $(this)
    , id = $this.data('id')
    , name = $this.html();

  if (window.confirm('确定要删除' + name + '吗？')) {
    $.ajax({
      url: '/records/' + id,
      method: 'DELETE',
      success: function(data, textStatus, xhr) {
        window.alert('删除成功!');
        location.reload();
      }
    })
  };
});

function renderChart(categories, series) {
  if (categories.length === 0 && series.length === 0) {
    $('#record-chart').html('暂无记录!');
    return;
  }
  $('#record-chart').highcharts({
    chart: { type: 'column' },
    title: { text: 'FPS 记录' },
    xAxis: { categories: categories },
    yAxis: {
      min: 0,
      title: { text: '帧速率 (fps)' },
      max: 60
    },
    tooltip: {
      headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
      pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td><td style="padding:0"><b>{point.y:.1f} </b></td></tr>',
      footerFormat: '</table>',
      shared: true,
      useHTML: true
    },
    plotOptions: {
      column: {
        pointPadding: 0.2,
        borderWidth: 0
      }
    },
    series: series
  });
};

function renderTable(theads, records) {
  function rowTemplate(r) {
    var htmlStr = '<tr>' 
                + '<td class="case-name" data-id="' + r._id + '">' + r.name + '</td>'
                + '<td>' + r.dotSize + '</td>'
                + '<td>' + r.df + '</td>';

    if (r.samples.split(",").length === 0) {
      htmlStr += '<td>N/A</td><td>N/A</td><td>N/A</td>';
    } else {
      htmlStr += '<td>' + r.mean.toFixed(3) + '</td>'
               + '<td>' + r.moe.toFixed(3) + '</td>'
               + '<td>' + r.variance.toFixed(3) + '</td>';
    }
    htmlStr += '<td>' + r.browserName + " " + r.browserVer + '</td>'
             + '<td>' + r.os + '</td>'
             + '<td>' + (r.isMobile ? '是' : '否') + '</td>'
             + '</tr>';
    return htmlStr;
  }

  var htmlStr = '<thead><tr>'
              + _.map(theads, function(h) { return '<th>' + h + '</th>' }).join('')
              + '</tr></thead>'
              + '<tbody>'
              + _.map(records, function(r) { return rowTemplate(r); }).join('')
              + '</tbody>'

  $('#record-table table').html('');
  $(htmlStr).appendTo($('#record-table table'));
}

function query(type, cond) {
  //var data = (type === 'dotSize') ? { dotSize: cond.dotSize } : { aniMethods: cond.aniMethods };
  var theads = ['动画方法', '移动的点的个数', '样本自由度(dF)', 'FPS', '标准误差(MoE)', '方差', '浏览器', '操作系统', '是否移动设备']; 
  $.ajax({
    url: '/api/records',
    dataType: 'json',
    data: cond,
    type: 'GET',
    success: function(data) {
      renderChart(data.categories, data.records);
      renderTable(theads, data.origRecords);
    }
  })
};

$(function() {
  var queryType = 'dotSize';
  var cond = {
    dotSize: $('input[name=dotSize]:checked').val(),
    aniMethods: _.map($('input[name=aniMethod]:checked'), function(elem) {
      return $(elem).val();
    }),
    os: $('select#systemType').val()
  }
  query(queryType, cond);

  $('select#systemType').on('change', function() {
    cond.os = $(this).val();
  });

  $('input[name=dotSize]').on('change', function(e) {
    cond.dotSize = $(this).val();
  });

  $('input[name=aniMethod]').on('change', function(e) {
    // Base on different animation types
    var $this = $(this);
    if ($this.is(':checked')) {
      // add 
      cond.aniMethods.push($this.val());
    } else {
      // remove
      _.remove(cond.aniMethods, function(m) {
        return m == $this.val();
      });
    }
  });

  $('form#controls').on('submit', function(e) {
    e.preventDefault();
    query(queryType, cond);
  });
});
