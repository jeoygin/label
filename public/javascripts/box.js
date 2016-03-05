var oriImage;

var KEY_CTRL = 17;

var Point = function(x, y) {
  this.x = x;
  this.y = y;
};

Point.prototype.setXY = function(x, y) {
  this.x = x;
  this.y = y;
};

Point.prototype.setPoint = function(pt) {
  this.x = pt.x;
  this.y = pt.y;
};

var Rect = function(x, y, w, h) {
  this.x = x;
  this.y = y;
  this.width = w;
  this.height = h;
};

Rect.prototype.contains = function(x ,y) {
  return x >= this.x && x < this.x + this.width &&
    y >= this.y && y < this.y + this.height;
};

Rect.prototype.copyFrom = function(rect) {
  this.x = rect.x;
  this.y = rect.y;
  this.width = rect.width;
  this.height = rect.height;
};

Rect.prototype.toArray = function() {
  return [this.x, this.y, this.width, this.height];
};

var Box = function(rect) {
  this.rect = new Rect(rect.x, rect.y, rect.width, rect.height);
};

var config = {
  ptFrom: new Point(0, 0),
  ptTo: new Point(0, 0),
  originRect: new Rect(0, 0, 0, 0),
  selectRect: new Rect(0, 0, 0, 0),
  imageLoaded: false,
  clicked: false,
  selectedBox: null,
  unitSize: 5,
  borderMask: 0,
  showBorderMask: 0,
  boxes: [],
  metakey: false
};

var getCanvas = function() {
  return document.getElementById('imageCanvas');
};

var loadImage = function() {
  console.log('Loading ' + imgurl);
  oriImage = new Image;
  oriImage.onload = function() {
    console.log('Loaded ' + imgurl);
    var canvas = getCanvas();
    if (canvas) {
      config.imageLoaded = true;
      loadBox(function(result) {
        var boxes = [];
        for (var i = 0; i < result.boxes.length; i++) {
          var b = result.boxes[i];
          boxes.push(new Box(new Rect(b[0], b[1], b[2], b[3])));
        }
        config.boxes = boxes;
        initCanvas(canvas, oriImage.width, oriImage.height);
        displayImage(canvas);
      });
    }
  }
  oriImage.src = imgurl;
};

var initCanvas = function(canvas, width, height) {
  console.log('Init canvas ' + width + 'x' + height);
  canvas.width = oriImage.width;
  canvas.height = oriImage.height;
  canvas.addEventListener('mousemove', onMouseMove, false);
  canvas.addEventListener('mousedown', onMouseDown, false);
  canvas.addEventListener('mouseup', onMouseUp, false);
  canvas.addEventListener('mouseout', onMouseOut, false);
};

var drawLine = function(ctx, pt1, pt2, color, width) {
  ctx.beginPath();
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.moveTo(pt1.x, pt1.y);
  ctx.lineTo(pt2.x, pt2.y);
  ctx.stroke();
};

var drawRect = function(ctx, x, y, width, height, color, linewidth) {
  ctx.beginPath();
  ctx.lineWidth = linewidth;
  ctx.strokeStyle = color;
  ctx.rect(x, y, width, height);
  ctx.stroke();
};

var drawText = function(ctx, message, x, y, font, align, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(message, x, y);
};

var displayImage = function(canvas, message) {
  var context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(oriImage, 0, 0);

  for (var i = 0; i < config.boxes.length; i++) {
    var box = config.boxes[i];
    if (box.rect.width > 0 && box.rect.height > 0) {
      var color = '#00FF00'
      if (box === config.selectedBox) {
        color = '#FF0000';
      }
      drawRect(context, box.rect.x, box.rect.y,
               box.rect.width, box.rect.height,
               color, '1');
    }
  }

  if (config.selectedBox && config.borderMask > 0) {
    var rect = config.selectedBox.rect;
    var color = '#FF00FF';

    var showBorderMask = config.showBorderMask;
    var linewidth = 1;
    if ((showBorderMask & 1) > 0) {
      drawLine(context, new Point(rect.x, rect.y),
               new Point(rect.x + rect.width - 1, rect.y),
               color, linewidth);
    }
    if ((showBorderMask & 4) > 0) {
      drawLine(context, new Point(rect.x, rect.y + rect.height - 1),
               new Point(rect.x + rect.width - 1, rect.y + rect.height - 1),
               color, linewidth);
    }
    if ((showBorderMask & 2) > 0) {
      drawLine(context, new Point(rect.x + rect.width - 1, rect.y),
               new Point(rect.x + rect.width - 1, rect.y + rect.height - 1),
               color, linewidth);
    }
    if ((showBorderMask & 8) > 0) {
      drawLine(context, new Point(rect.x, rect.y),
               new Point(rect.x, rect.y + rect.height - 1),
               color, linewidth);
    }

  }

  if (message) {
    drawText(context, message, canvas.width - 10, 20, '16pt Calibri', 'right', '#FF0000');
  }
};

var getMousePos = function(canvas, event) {
  return new Point(event.offsetX, event.offsetY);
};

var calcBorder = function(x, y, box) {
  var borderMask = 0;
  if (box && box.rect) {
    var rect = box.rect;
    if (x > rect.x - 3 && x < rect.x + rect.width + 3) {
      if (Math.abs(y - rect.y) < 3) {
        borderMask |= 1;
      }
      if (Math.abs(y - (rect.y + rect.height)) < 3) {
        borderMask |= 1 << 2;
      }
    }
    if (y > rect.y - 3 && y < rect.y + rect.height + 3) {
      if (Math.abs(x - rect.x) < 3) {
        borderMask |= 1 << 3;
      }
      if (Math.abs(x - (rect.x + rect.width)) < 3) {
        borderMask |= 1 << 1;
      }
    }
    if (borderMask == 0 && rect.contains(x, y)) {
      borderMask = (1 << 4) - 1;
    }
  }
  return borderMask;
};

var remove = function() {
  if (config.selectedBox) {
    for (var i = 0; i < config.boxes.length; i++) {
      if (config.boxes[i] === config.selectedBox) {
        config.boxes.splice(i, 1);
        config.selectedBox = null;
        break;
      }
    }
  }
};

var changeUnitSize = function(value) {
  if (!config.imageLoaded) {
    return;
  }
  var canvas = getCanvas();
  config.unitSize = Math.max(1, config.unitSize + value);
  displayImage(getCanvas(), config.unitSize);
};

var move = function(x, y) {
  if (!config.imageLoaded) {
    return;
  }
  var box = config.selectedBox;
  if (box && box.rect.width > 0 && box.rect.height > 0) {
    box.rect.x = Math.min(Math.max(0, box.rect.x + config.unitSize * x),
                          oriImage.width - box.rect.width);
    box.rect.y = Math.min(Math.max(0, box.rect.y + config.unitSize * y),
                          oriImage.height - box.rect.height);
    displayImage(getCanvas());
  }
};

var changeSize = function(x, y) {
  if (!config.imageLoaded) {
    return;
  }
  var box = config.selectedBox;
  if (box && box.rect.width > 0 && box.rect.height > 0) {
    if (box.rect.width + x * config.unitSize > 0) {
      box.rect.width = Math.min(box.rect.width + x * config.unitSize,
                                oriImage.width - box.rect.x);
    }
    if (box.rect.height + y * config.unitSize > 0) {
      box.rect.height = Math.min(box.rect.height + y * config.unitSize,
                                 oriImage.height - box.rect.y);
    }
    displayImage(getCanvas());
  }
};

var loadBox = function(callback) {
  $.get(boxapi)
    .done(function(result) {
      callback && callback(result);
    })
    .fail(function(err){
      console.log(JSON.stringify(err));
      alert('加载失败')
    });
};

var saveBox = function(callback) {
  var boxes = [];
  for (var i = 0; i < config.boxes.length; i++) {
    boxes.push(config.boxes[i].rect.toArray());
  }
  var req = {};
  req.boxes = boxes;
  console.log(JSON.stringify(req));

  $.ajaxSetup({
    contentType: "application/json; charset=utf-8"
  });
  $.post(boxapi, JSON.stringify(req))
    .done(function(result) {
      callback && callback();
    })
    .fail(function(err) {
      console.log(JSON.stringify(err));
      alert('保存失败');
    });
};

var previousImage = function() {
  saveBox(function() {
    window.location.href='' + (id - 1);
  });
};

var nextImage = function() {
  saveBox(function() {
    window.location.href='' + (id + 1);
  });
};

var onMouseDown = function(event) {
  if (!config.imageLoaded) {
    return;
  }

  var canvas = getCanvas();
  var mousePos = getMousePos(canvas, event);
  var x = mousePos.x, y = mousePos.y;
  config.clicked = true;
  config.ptFrom.setPoint(mousePos);
  config.ptTo.setPoint(mousePos);

  if (config.borderMask == 0) {
    config.selectedBox = null;
    for (var i = 0; i < config.boxes.length; i++) {
      var rect = config.boxes[i].rect;
      if (rect.contains(x, y)) {
        config.borderMask = (1 << 4) - 1;
      }
      if (config.borderMask > 0) {
        config.selectedBox = config.boxes[i];
        break;
      }
    }
    console.log(config.selectedBox);
  }

  if (!config.selectedBox) {
    var newBox = new Box(new Rect(x, y, 1, 1));
    config.boxes.push(newBox);
    config.selectedBox = newBox;
    config.borderMask = (1 << 1) | (1 << 2);
  }
  if (config.selectedBox.rect.width > 3 && config.selectedBox.rect.height > 3) {
    config.borderMask = calcBorder(x, y, config.selectedBox);
  }
  config.originRect = new Rect(config.selectedBox.rect.x,
                               config.selectedBox.rect.y,
                               config.selectedBox.rect.width,
                               config.selectedBox.rect.height);

  displayImage(canvas, '(' + x + ',' + y + ')');
};

var onMouseUp = function(event) {
  if (!config.imageLoaded) {
    return;
  }
  console.log(config.boxes);
  var canvas = getCanvas();
  var mousePos = getMousePos(canvas, event);
  var x = mousePos.x, y = mousePos.y;

  if (config.clicked) {
    config.ptTo.setPoint(mousePos);
  }

  if (config.selectedBox && (config.selectedBox.rect.width <= 3
                             || config.selectedBox.rect.height <= 3)) {
    remove();
  }
  config.clicked = false;

  displayImage(canvas, '(' + x + ',' + y + ')');
};

var onMouseOut = function(event) {
  onMouseUp(event);
};

var onMouseMove = function(event) {
  if (!config.imageLoaded) {
    return;
  }

  var canvas = getCanvas();
  var mousePos = getMousePos(canvas, event);
  var x = mousePos.x, y = mousePos.y;

  if (config.clicked) {
    config.ptTo.setPoint(mousePos);
    var borderMask = config.borderMask;
    if (borderMask > 0) {
      var rect = config.originRect;
      var x0 = rect.x, x1 = rect.x + rect.width - 1;
      var y0 = rect.y, y1 = rect.y + rect.height - 1;
      if ((borderMask & 1) > 0) {
        y0 += config.ptTo.y - config.ptFrom.y;
      }
      if ((borderMask & 2) > 0) {
        x1 += config.ptTo.x - config.ptFrom.x;
      }
      if ((borderMask & 4) > 0) {
        y1 += config.ptTo.y - config.ptFrom.y;
      }
      if ((borderMask & 8) > 0) {
        x0 += config.ptTo.x - config.ptFrom.x;
      }
      config.selectedBox.rect.x = Math.min(x0, x1);
      config.selectedBox.rect.y = Math.min(y0, y1);
      config.selectedBox.rect.width = Math.abs(x1 - x0) + 1;
      config.selectedBox.rect.height = Math.abs(y1 - y0) + 1;
      config.selectedBox.rect.x = Math.min(Math.max(0, config.selectedBox.rect.x), canvas.width - config.selectedBox.rect.width);
      config.selectedBox.rect.y = Math.min(Math.max(0, config.selectedBox.rect.y), canvas.height - config.selectedBox.rect.height);
    }
  } else {
    config.borderMask = calcBorder(x, y, config.selectedBox);
  }
  config.showBorderMask = calcBorder(x, y, config.selectedBox);

  displayImage(canvas, '(' + x + ',' + y + ')');
};

var onKeyPress = function(event) {
  var key = event.keyCode || event.which;
  var keychar = String.fromCharCode(key);
  switch (keychar) {
  case '+':
    changeUnitSize(1);
    break;
  case '-':
    changeUnitSize(-1);
    break;
  case 'I':
  case 'i':
    move(0, -1);
    break;
  case 'K':
  case 'k':
    move(0, 1);
    break;
  case 'J':
  case 'j':
    move(-1, 0);
    break;
  case 'L':
  case 'l':
    move(1, 0);
    break;
  case '>':
    changeSize(1, 0);
    break;
  case '<':
    changeSize(-1, 0);
    break;
  case '^':
    changeSize(0, 1);
    break;
  case '_':
    changeSize(0, -1);
    break;
  default:
  }
  switch (key) {
  case 19: // CTRL-s
    saveBox(function() {
      alert('保存成功');
    });
    break;
  }
};

var onKeyDown = function(event) {
  var key = event.keyCode || event.which;

  if (key == KEY_CTRL) {
    config.metakey = true;
  }
};

var onKeyUp = function(event) {
  var key = event.keyCode || event.which;

  if (key == KEY_CTRL) {
    config.metakey = false;
  }
};
