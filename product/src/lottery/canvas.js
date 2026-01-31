(function () {
  //based on an Example by @curran
  window.requestAnimFrame = (function () {
    return window.requestAnimationFrame;
  })();
  var canvas = document.getElementById("canvas");

  ~~(function setSize() {
    //定义canvas的宽高，让他跟浏览器的窗口的宽高相同
    window.onresize = arguments.callee;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
  })();

  var c = canvas.getContext("2d");

  var numStars = 800;
  var radius = "0." + Math.floor(Math.random() * 9) + 1;
  var focalLength = canvas.width * 2;
  var warp = 0;
  var centerX, centerY;

  var stars = [],
    star;
  var i;

  var animate = true;

  initializeStars();

  function executeFrame() {
    if (animate) requestAnimFrame(executeFrame);
    moveStars();
    drawStars();
  }

  function initializeStars() {
    centerX = canvas.width / 2;
    centerY = canvas.height / 2;

    stars = [];
    for (i = 0; i < numStars; i++) {
      star = {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * canvas.width,
        o: "0." + Math.floor(Math.random() * 99) + 1,
        // 使用更突出且与喜庆背景协调的颜色
        color: [
          "rgba(255, 80, 80, ",   // 鲜红色，喜庆且突出
          "rgba(255, 130, 0, ",   // 橙红色，温暖醒目
          "rgba(255, 50, 150, ",  // 洋红色，明亮突出
          "rgba(200, 0, 100, ",   // 深粉色，对比明显
          "rgba(230, 50, 50, "    // 亮红色，喜庆主题
        ][Math.floor(Math.random() * 5)]
      };
      stars.push(star);
    }
  }

  function moveStars() {
    for (i = 0; i < numStars; i++) {
      star = stars[i];
      star.z--;

      if (star.z <= 0) {
        star.z = canvas.width;
      }
    }
  }

  function drawStars() {
    var pixelX, pixelY, pixelRadius;

    // Resize to the screen
    if (
      canvas.width != window.innerWidth ||
      canvas.width != window.innerWidth
    ) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initializeStars();
    }
    
    // 保留喜庆的背景色
    if (warp == 0) {
      var gradient = c.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, "rgba(255, 228, 225, 1)");  // 浅粉色
      gradient.addColorStop(0.5, "rgba(255, 240, 200, 1)"); // 浅橙色
      gradient.addColorStop(1, "rgba(255, 250, 240, 1)");   // 浅黄色
      c.fillStyle = gradient;
      c.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // 使用更突出、对比度更高的星星颜色
    for (i = 0; i < numStars; i++) {
      star = stars[i];

      pixelX = (star.x - centerX) * (focalLength / star.z);
      pixelX += centerX;
      pixelY = (star.y - centerY) * (focalLength / star.z);
      pixelY += centerY;
      pixelRadius = 1 * (focalLength / star.z);

      // 使用更突出的星星颜色，并添加轻微的外发光效果
      c.fillStyle = star.color + (parseFloat(star.o) * 1.2) + ")";
      c.fillRect(pixelX, pixelY, pixelRadius, pixelRadius);
      
      // 给星星添加轻微的外发光，使其更突出
      c.shadowColor = star.color.replace("rgba(", "").split(",")[0] + ", " + 
                     star.color.replace("rgba(", "").split(",")[1] + ", " + 
                     star.color.replace("rgba(", "").split(",")[2] + ", 0.3)";
      c.shadowBlur = 2;
    }
    
    // 重置阴影效果，避免影响其他绘制
    c.shadowColor = "transparent";
    c.shadowBlur = 0;
  }

  // document.getElementById('warp').addEventListener("click", function(e) {
  //     window.c.beginPath();
  //     window.c.clearRect(0, 0, window.canvas.width, window.canvas.height);
  //     window.warp = warp ? 0 : 1;
  //     executeFrame();
  // });

  executeFrame();
})();