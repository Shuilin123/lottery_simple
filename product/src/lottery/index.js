import "./index.css";
import "../css/animate.min.css";
import "./canvas.js";
// 绑定奖品管理按钮事件

import {
  addQipao,
  setPrizes,
  showPrizeList,
  setPrizeData,
  setPrizeSummary,
  resetPrize
} from "./prizeList";
import { NUMBER_MATRIX } from "./config.js";

const ROTATE_TIME = 3000;
const ROTATE_LOOP = 1000;
const BASE_HEIGHT = 1080;

let TOTAL_CARDS,
  btns = {
    enter: document.querySelector("#enter"),
    lotteryBar: document.querySelector("#lotteryBar"),
    lottery: document.querySelector("#lottery")
  },
  drawCountInput = document.querySelector("#drawCount"),
  prizes,
  ROW_COUNT = 7,
  COLUMN_COUNT = 17,
  COMPANY,
  HIGHLIGHT_CELL = [],
  // 当前的比例
  Resolution = 1;

let camera,
  scene,
  renderer,
  controls,
  threeDCards = [],
  targets = {
    table: [],
    sphere: []
  };

let rotateObj;

let selectedCardIndex = [],
  drawnCardIndex = new Set(),
  pendingReturnCardIndex = new Set(),
  rotate = false,
  basicData = {
    prizes: [], //奖品信息
    users: [], //所有人员
    luckyUsers: {}, //已中奖人员
    leftUsers: [] //未中奖人员
  },
  interval,
  // 正在抽奖
  isLotting = false,
  currentLuckys = [];

let hasShownEmptyPrizeAlert = false;

initAll();

/**
 * 初始化所有DOM
 */
function initAll() {
  window.AJAX({
    url: "/getTempData",
    success(data) {
      // 获取基础数据
      prizes = data.cfgData.prizes;
      COMPANY = data.cfgData.COMPANY;
      HIGHLIGHT_CELL = createHighlight();
      basicData.prizes = prizes;
      setPrizes(prizes);

      TOTAL_CARDS = ROW_COUNT * COLUMN_COUNT;

      // 读取当前已设置的抽奖结果
      basicData.leftUsers = data.leftUsers;
      basicData.luckyUsers = data.luckyData;

      const remainingMap = getRemainingMap();
      const totalLeft = getTotalRemaining(remainingMap);
      showPrizeList(totalLeft);
      basicData.prizes.forEach(prize => {
        setPrizeData(prize.type, remainingMap[prize.type] || 0, prize.count);
      });
      updateCardPrizeCounts(remainingMap);
    }
  });

  window.AJAX({
    url: "/getUsers",
    success(data) {
      basicData.users = data;

      initCards();
      // startMaoPao();
      animate();
      shineCard();
    }
  });
}

function getDrawCount() {
  let count = parseInt(drawCountInput ? drawCountInput.value : "1", 10);
  if (!Number.isFinite(count) || count < 1) {
    count = 1;
  }
  if (drawCountInput) {
    drawCountInput.value = count;
  }
  return count;
}

function getRemainingMap(includePending = false) {
  const remaining = {};
  if (!basicData.prizes || basicData.prizes.length === 0) {
    return remaining;
  }

  basicData.prizes.forEach(prize => {
    remaining[prize.type] = prize.count || 0;
  });

  Object.keys(basicData.luckyUsers || {}).forEach(type => {
    const count = (basicData.luckyUsers[type] || []).length;
    if (remaining[type] !== undefined) {
      remaining[type] -= count;
    }
  });

  const currentList = includePending
    ? currentLuckys
    : currentLuckys.filter(item => item && item.revealed);
  currentList.forEach(item => {
    if (item && item.prize && remaining[item.prize.type] !== undefined) {
      remaining[item.prize.type] -= 1;
    }
  });

  Object.keys(remaining).forEach(type => {
    if (remaining[type] < 0) {
      remaining[type] = 0;
    }
  });

  return remaining;
}

function getTotalRemaining(remaining) {
  return Object.values(remaining || {}).reduce((sum, value) => {
    return sum + (value || 0);
  }, 0);
}

function updateCardPrizeCounts(remaining) {
  if (!threeDCards || threeDCards.length === 0 || !remaining) {
    return;
  }
  threeDCards.forEach(cardObj => {
    const card = cardObj.element;
    if (!card || !card.dataset) {
      return;
    }
    const type = card.dataset.prizeType;
    if (type === undefined || type === "") {
      return;
    }
    if (remaining[type] !== undefined) {
      card.dataset.prizeCount = String(remaining[type]);
      if (card.dataset.revealed === "1") {
        renderCardBackPrize(card);
      }
    }
  });
}

function updatePrizeUI(includePending = false) {
  const remaining = getRemainingMap(includePending);
  const totalLeft = getTotalRemaining(remaining);
  setPrizeSummary(totalLeft);
  basicData.prizes.forEach(prize => {
    setPrizeData(prize.type, remaining[prize.type] || 0, prize.count);
  });
  updateCardPrizeCounts(remaining);
  return { remaining, totalLeft };
}

function showEmptyPrizeAlert() {
  if (hasShownEmptyPrizeAlert) {
    return;
  }
  hasShownEmptyPrizeAlert = true;
  window.alert("所有奖项已抽完，无法继续抽奖。");
}

function initCards() {
  let member = basicData.users.slice();
  if (!member.length) {
    member = new Array(ROW_COUNT * COLUMN_COUNT).fill(["", "", ""]);
  }
  let showCards = [],
    length = member.length;

  let isBold = false,
    showTable = basicData.leftUsers.length === basicData.users.length,
    index = 0,
    totalMember = member.length,
    position = {
      x: (140 * COLUMN_COUNT - 20) / 2,
      y: (180 * ROW_COUNT - 20) / 2
    };

  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = 3000;

  scene = new THREE.Scene();

  for (let i = 0; i < ROW_COUNT; i++) {
    for (let j = 0; j < COLUMN_COUNT; j++) {
      isBold = HIGHLIGHT_CELL.includes(j + "-" + i);
      var element = createCard(
        member[index % length],
        isBold,
        index,
        showTable
      );

      var object = new THREE.CSS3DObject(element);
      object.position.x = Math.random() * 4000 - 2000;
      object.position.y = Math.random() * 4000 - 2000;
      object.position.z = Math.random() * 4000 - 2000;
      scene.add(object);
      threeDCards.push(object);
      //

      var object = new THREE.Object3D();
      object.position.x = j * 140 - position.x;
      object.position.y = -(i * 180) + position.y;
      targets.table.push(object);
      index++;
    }
  }

  // sphere

  var vector = new THREE.Vector3();

  for (var i = 0, l = threeDCards.length; i < l; i++) {
    var phi = Math.acos(-1 + (2 * i) / l);
    var theta = Math.sqrt(l * Math.PI) * phi;
    var object = new THREE.Object3D();
    object.position.setFromSphericalCoords(800 * Resolution, phi, theta);
    vector.copy(object.position).multiplyScalar(2);
    object.lookAt(vector);
    targets.sphere.push(object);
  }

  renderer = new THREE.CSS3DRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("container").appendChild(renderer.domElement);

  //

  controls = new THREE.TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 0.5;
  controls.minDistance = 500;
  controls.maxDistance = 6000;
  controls.addEventListener("change", render);

  bindEvent();

  updateCardPrizeCounts(getRemainingMap());

  if (showTable) {
    switchScreen("enter");
  } else {
    switchScreen("lottery");
  }
}

function setLotteryStatus(status = false) {
  isLotting = status;
}

/**
 * 事件绑定
 */
function bindEvent() {
  document.querySelector("#menu").addEventListener("click", function (e) {
    e.stopPropagation();
    // 如果正在抽奖，则禁止一切操作
    if (isLotting) {
      if (e.target.id === "lottery") {
        rotateObj.stop();
        btns.lottery.innerHTML = "开始抽奖";
      } else {
        addQipao("正在抽奖，抽慢一点点～～");
      }
      return false;
    }

    let target = e.target.id;
    switch (target) {
      // 显示数字墙
      case "welcome":
        switchScreen("enter");
        rotate = false;
        break;
      // 进入抽奖
      case "enter":
        removeHighlight();
        addQipao("马上抽奖，不要走开。");
        // rotate = !rotate;
        rotate = true;
        switchScreen("lottery");
        break;
      // 重置
      case "reset":
        let doREset = window.confirm(
          "是否确认重置数据，重置后，当前已抽的奖项全部清空？"
        );
        if (!doREset) {
          return;
        }
        hasShownEmptyPrizeAlert = false;
        addQipao("重置所有数据，重新抽奖");
        addHighlight();
        resetCard();
        clearDrawnCards();
        // 重置所有数据
        currentLuckys = [];
        basicData.leftUsers = Object.assign([], basicData.users);
        basicData.luckyUsers = {};
        const remainingMap = getRemainingMap();
        const totalLeft = getTotalRemaining(remainingMap);
        resetPrize(totalLeft);
        basicData.prizes.forEach(prize => {
          setPrizeData(prize.type, remainingMap[prize.type] || 0, prize.count);
        });
        reset();
        switchScreen("enter");
        break;
      // 抽奖
      case "lottery":
        setLotteryStatus(true);
        if (!basicData.users || basicData.users.length === 0) {
          addQipao("暂无参与者名单，请先准备名单后再开始抽奖。");
          setLotteryStatus(false);
          return;
        }
        // 每次抽奖前先保存上一次的抽奖数据
        saveData()
          .catch(() => {})
          .then(() => {
            return resetCard();
          })
          .then(() => {
            // 抽奖
            lottery();
          });
        addQipao("正在抽奖，调整好姿势");
        break;
      // 重新抽奖
      case "reLottery":
        if (currentLuckys.length === 0) {
          addQipao(`当前还没有抽奖，无法重新抽取喔~~`);
          return;
        }
        setErrorData(currentLuckys.map(item => item.user));
        addQipao("重新抽取，做好准备");
        setLotteryStatus(true);
        updatePrizeUI(false);
        // 重新抽奖则直接进行抽取，不对上一次的抽奖数据进行保存
        // 抽奖
        resetCard().then(res => {
          // 抽奖
          lottery();
        });
        break;
      // 导出抽奖结果
      case "save":
        saveData().then(res => {
          resetCard().then(res => {
            // 将之前的记录置空
            currentLuckys = [];
          });
          exportData();
          addQipao(`数据已保存到EXCEL中。`);
        });
        break;
    }
  });

  window.addEventListener("resize", onWindowResize, false);
}

function switchScreen(type) {
  switch (type) {
    case "enter":
      btns.enter.classList.remove("none");
      btns.lotteryBar.classList.add("none");
      transform(targets.table, 2000);
      break;
    default:
      btns.enter.classList.add("none");
      btns.lotteryBar.classList.remove("none");
      transform(targets.sphere, 2000);
      break;
  }
}

/**
 * 创建元素
 */
function createElement(css, text) {
  let dom = document.createElement("div");
  dom.className = css || "";
  dom.innerHTML = text || "";
  return dom;
}

function getPrizeByIndex(cardIndex) {
  if (!basicData.prizes || basicData.prizes.length === 0) {
    return null;
  }
  return basicData.prizes[cardIndex % basicData.prizes.length];
}

function renderCardFront(element) {
  const front = element.querySelector(".card-front");
  if (!front) {
    return;
  }
  if (element.dataset.drawn === "1") {
    front.innerHTML = `
      <div class="card-cover">
        <div class="cover-glow"></div>
        <div class="cover-title">已抽中</div>
        <div class="cover-subtitle">请等待下一轮</div>
        <div class="cover-ribbon">DONE</div>
        <div class="cover-stamp">HIT</div>
      </div>
    `;
    return;
  }
  front.innerHTML = `
    <div class="card-cover">
      <div class="cover-glow"></div>
      <div class="cover-title">幸运卡</div>
      <div class="cover-subtitle">抽中后点击揭晓</div>
      <div class="cover-ribbon">LUCKY</div>
      <div class="cover-stamp">OPEN</div>
    </div>
  `;
}

function renderCardBackPlaceholder(element) {
  const back = element.querySelector(".card-back");
  if (!back) {
    return;
  }
  back.innerHTML = `
    <div class="envelope">
      <div class="envelope-top"></div>
      <div class="envelope-body"></div>
      <div class="envelope-shine"></div>
    </div>
    <div class="prize-reveal prize-panel is-placeholder">
      <div class="prize-header">
        <div class="prize-tag">奖品信息</div>
        <div class="prize-count-badge">等待揭晓</div>
      </div>
      <div class="prize-title">点击拆红包</div>
      <div class="prize-meta">好运正在靠近</div>
      <div class="prize-media">
        <div class="prize-icon">?</div>
      </div>
    </div>
  `;
}

function renderCardBackPrize(element) {
  const back = element.querySelector(".card-back");
  if (!back) {
    return;
  }
  const prizeText = element.dataset.prizeText || "神秘奖项";
  const prizeTitle = element.dataset.prizeTitle || "幸运大奖";
  const prizeCount =
    element.dataset.prizeCount !== "" && element.dataset.prizeCount !== undefined
      ? `剩余 ${element.dataset.prizeCount}`
      : "数量未知";
  const prizeImg = element.dataset.prizeImg || "";
  back.innerHTML = `
    <div class="envelope">
      <div class="envelope-top"></div>
      <div class="envelope-body"></div>
      <div class="envelope-seal">拆</div>
      <div class="envelope-shine"></div>
    </div>
    <div class="prize-reveal prize-panel">
      <div class="prize-header">
        <div class="prize-tag">${prizeTitle}</div>
        <div class="prize-count-badge">${prizeCount}</div>
      </div>
      <div class="prize-body">
        <div class="prize-media">
          ${
            prizeImg
              ? `<img src="${prizeImg}" alt="${prizeTitle}">`
              : `<div class="prize-icon">?</div>`
          }
        </div>
        <div class="prize-info">
          <div class="prize-title">${prizeTitle}</div>
          <div class="prize-meta">${prizeText}</div>
        </div>
      </div>
    </div>
  `;
}

function openPrizeCard(element, forceReveal = false) {
  if (!forceReveal && element.dataset.revealable !== "1") {
    return;
  }
  if (element.dataset.revealed === "1") {
    return;
  }
  const cardIndex = parseInt(element.dataset.cardIndex || "", 10);
  renderCardBackPrize(element);
  element.dataset.revealed = "1";
  element.classList.add("flipped");
  element.classList.add("opening");
  element.classList.add("flip-animate");
  
  const luckyIndex = parseInt(element.dataset.luckyIndex || "", 10);
  if (Number.isFinite(luckyIndex) && currentLuckys[luckyIndex]) {
    const item = currentLuckys[luckyIndex];
    if (!item.revealed) {
      item.revealed = true;
      const { totalLeft } = updatePrizeUI(false);
      if (totalLeft <= 0) {
        showEmptyPrizeAlert();
      }
    }
  }

  setTimeout(() => {
    element.classList.remove("flip-animate");
    element.classList.remove("opening");
    element.classList.add("opened");
  }, 900);

  if (Number.isFinite(cardIndex)) {
    drawnCardIndex.add(cardIndex);
    pendingReturnCardIndex.add(cardIndex);
    element.dataset.drawn = "1";
    element.classList.add("drawn");
    selectedCardIndex = selectedCardIndex.filter(idx => idx !== cardIndex);
    element.dataset.revealable = "0";
  }
}

function returnPrizeCard(element, duration = 500) {
  if (!element) {
    return;
  }
  const cardIndex = parseInt(element.dataset.cardIndex || "", 10);
  if (!Number.isFinite(cardIndex)) {
    return;
  }
  const object = threeDCards[cardIndex];
  const target = targets.sphere[cardIndex];
  if (!object || !target) {
    return;
  }

  new TWEEN.Tween(object.position)
    .to(
      {
        x: target.position.x,
        y: target.position.y,
        z: target.position.z
      },
      Math.random() * duration + duration
    )
    .easing(TWEEN.Easing.Exponential.InOut)
    .start();

  new TWEEN.Tween(object.rotation)
    .to(
      {
        x: target.rotation.x,
        y: target.rotation.y,
        z: target.rotation.z
      },
      Math.random() * duration + duration
    )
    .easing(TWEEN.Easing.Exponential.InOut)
    .start();

  new TWEEN.Tween(this)
    .to({}, duration * 2)
    .onUpdate(render)
    .start()
    .onComplete(() => {
      element.classList.remove("prize");
      element.classList.remove("flipped");
      element.classList.remove("revealable");
      element.classList.remove("opening");
      element.classList.remove("opened");
      element.dataset.revealable = "0";
      element.dataset.prizeText = "";
      element.dataset.prizeTitle = "";
      element.dataset.prizeCount = "";
      element.dataset.prizeImg = "";
      element.dataset.prizeType = "";
      element.dataset.luckyIndex = "";
      element.dataset.revealed = "0";
      renderCardBackPlaceholder(element);
      changeCard(cardIndex, getPrizeByIndex(cardIndex));
      pendingReturnCardIndex.delete(cardIndex);
    });
}

function clearDrawnCards() {
  drawnCardIndex.clear();
  threeDCards.forEach(cardObj => {
    const element = cardObj.element;
    element.dataset.drawn = "0";
    element.classList.remove("drawn");
    element.classList.remove("flipped");
    element.classList.remove("opened");
    element.classList.remove("opening");
    renderCardFront(element);
    renderCardBackPlaceholder(element);
  });
}

/**
 * 创建名牌
 */
function createCard(user, isBold, id, showTable) {
  var element = createElement();
  element.id = "card-" + id;
  element.dataset.cardIndex = String(id);
  element.dataset.drawn = "0";

  if (isBold) {
    element.className = "element lightitem card";
    if (showTable) {
      element.classList.add("highlight");
    }
  } else {
    element.className = "element card";
    element.style.backgroundColor =
      "rgba(0,127,127," + (Math.random() * 0.7 + 0.25) + ")";
  }

  const prize = getPrizeByIndex(id);
  element.innerHTML = `
    <div class="card-inner">
      <div class="card-face card-front"></div>
      <div class="card-face card-back"></div>
    </div>
  `;
  setCardPrizeData(element, prize);
  renderCardFront(element);
  renderCardBackPlaceholder(element);

  element.addEventListener("click", () => {
    if (isLotting) {
      return;
    }
    if (!element.classList.contains("prize")) {
      return;
    }
    if (element.dataset.revealed === "1") {
      returnPrizeCard(element);
      return;
    }
    if (element.dataset.revealable !== "1") {
      element.dataset.revealable = "1";
      element.classList.add("revealable");
    }
    openPrizeCard(element, true);
  });
  return element;
}

function removeHighlight() {
  document.querySelectorAll(".highlight").forEach(node => {
    node.classList.remove("highlight");
  });
}

function addHighlight() {
  document.querySelectorAll(".lightitem").forEach(node => {
    node.classList.add("highlight");
  });
}

/**
 * 渲染地球等
 */
function transform(targets, duration) {
  // TWEEN.removeAll();
  for (var i = 0; i < threeDCards.length; i++) {
    var object = threeDCards[i];
    var target = targets[i];

    new TWEEN.Tween(object.position)
      .to(
        {
          x: target.position.x,
          y: target.position.y,
          z: target.position.z
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    new TWEEN.Tween(object.rotation)
      .to(
        {
          x: target.rotation.x,
          y: target.rotation.y,
          z: target.rotation.z
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();
  }

  new TWEEN.Tween(this)
    .to({}, duration * 2)
    .onUpdate(render)
    .start();
}

// function rotateBall() {
//   return new Promise((resolve, reject) => {
//     scene.rotation.y = 0;
//     new TWEEN.Tween(scene.rotation)
//       .to(
//         {
//           y: Math.PI * 8
//         },
//         ROTATE_TIME
//       )
//       .onUpdate(render)
//       .easing(TWEEN.Easing.Exponential.InOut)
//       .start()
//       .onComplete(() => {
//         resolve();
//       });
//   });
// }

function rotateBall() {
  return new Promise((resolve, reject) => {
    scene.rotation.y = 0;
    rotateObj = new TWEEN.Tween(scene.rotation);
    rotateObj
      .to(
        {
          y: Math.PI * 6 * ROTATE_LOOP
        },
        ROTATE_TIME * ROTATE_LOOP
      )
      .onUpdate(render)
      // .easing(TWEEN.Easing.Linear)
      .start()
      .onStop(() => {
        scene.rotation.y = 0;
        resolve();
      })
      .onComplete(() => {
        resolve();
      });
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

function animate() {
  // 让场景通过x轴或者y轴旋转
  // rotate && (scene.rotation.y += 0.088);

  requestAnimationFrame(animate);
  TWEEN.update();
  controls.update();

  // 渲染循环
  // render();
}

function render() {
  renderer.render(scene, camera);
}

function selectCard(duration = 600) {
  rotate = false;
  let width = 140,
    tag = -(currentLuckys.length - 1) / 2,
    locates = [];

  // 计算位置信息, 大于5个分两排显示
  if (currentLuckys.length > 5) {
    let yPosition = [-87, 87],
      l = selectedCardIndex.length,
      mid = Math.ceil(l / 2);
    tag = -(mid - 1) / 2;
    for (let i = 0; i < mid; i++) {
      locates.push({
        x: tag * width * Resolution,
        y: yPosition[0] * Resolution
      });
      tag++;
    }

    tag = -(l - mid - 1) / 2;
    for (let i = mid; i < l; i++) {
      locates.push({
        x: tag * width * Resolution,
        y: yPosition[1] * Resolution
      });
      tag++;
    }
  } else {
    for (let i = selectedCardIndex.length; i > 0; i--) {
      locates.push({
        x: tag * width * Resolution,
        y: 0 * Resolution
      });
      tag++;
    }
  }

  addQipao("恭喜中奖，点击卡片揭晓奖品！");

  selectedCardIndex.forEach((cardIndex, index) => {
    const prize = currentLuckys[index] ? currentLuckys[index].prize : null;
    changeCard(cardIndex, prize);
    setCardWinnerData(cardIndex, prize);
    var object = threeDCards[cardIndex];
    object.element.dataset.luckyIndex = String(index);
    new TWEEN.Tween(object.position)
      .to(
        {
          x: locates[index].x,
          y: locates[index].y * Resolution,
          z: 2200
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    new TWEEN.Tween(object.rotation)
      .to(
        {
          x: 0,
          y: 0,
          z: 0
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    object.element.classList.add("prize");
    tag++;
  });

  new TWEEN.Tween(this)
    .to({}, duration * 2)
    .onUpdate(render)
    .start()
    .onComplete(() => {
      // 动画结束后可以操作
      setLotteryStatus();
    });
}

/**
 * 重置抽奖牌内容
 */
function resetCard(duration = 500) {
  const resetIndexSet = new Set([
    ...selectedCardIndex,
    ...pendingReturnCardIndex
  ]);
  if (resetIndexSet.size === 0) {
    return Promise.resolve();
  }

  const resetIndexList = Array.from(resetIndexSet);
  resetIndexList.forEach(index => {
    let object = threeDCards[index],
      target = targets.sphere[index];

    new TWEEN.Tween(object.position)
      .to(
        {
          x: target.position.x,
          y: target.position.y,
          z: target.position.z
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    new TWEEN.Tween(object.rotation)
      .to(
        {
          x: target.rotation.x,
          y: target.rotation.y,
          z: target.rotation.z
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();
  });

  return new Promise((resolve, reject) => {
    new TWEEN.Tween(this)
      .to({}, duration * 2)
      .onUpdate(render)
      .start()
      .onComplete(() => {
        resetIndexList.forEach(index => {
          let object = threeDCards[index];
          object.element.classList.remove("prize");
          object.element.classList.remove("flipped");
          object.element.classList.remove("revealable");
          object.element.classList.remove("opening");
          object.element.classList.remove("opened");
          object.element.dataset.revealable = "0";
          object.element.dataset.prizeText = "";
          object.element.dataset.prizeTitle = "";
          object.element.dataset.prizeCount = "";
          object.element.dataset.prizeImg = "";
          object.element.dataset.prizeType = "";
          object.element.dataset.luckyIndex = "";
          object.element.dataset.revealed = "0";
          renderCardBackPlaceholder(object.element);
          changeCard(index, getPrizeByIndex(index));
        });
        updateCardPrizeCounts(getRemainingMap());
        pendingReturnCardIndex.clear();
        resolve();
      });
  });
}

/**
 * 抽奖
 */
function lottery() {
  // if (isLotting) {
  //   rotateObj.stop();
  //   btns.lottery.innerHTML = "开始抽奖";
  //   return;
  // }
  btns.lottery.innerHTML = "结束抽奖";
  rotateBall().then(() => {
    // 将之前的记录置空
    currentLuckys = [];
    selectedCardIndex = [];
    let drawCount = getDrawCount();
    let leftCount = basicData.leftUsers.length;
    const remainingMap = getRemainingMap();
    let totalRemaining = getTotalRemaining(remainingMap);

    if (totalRemaining <= 0) {
      addQipao("奖品已抽完，无法继续抽奖。");
      showEmptyPrizeAlert();
      setLotteryStatus(false);
      btns.lottery.innerHTML = "开始抽奖";
      return;
    }

    if (leftCount < drawCount) {
      addQipao("剩余参与抽奖人员不足，现在重新设置所有人员可以进行二次抽奖！");
      basicData.leftUsers = basicData.users.slice();
      leftCount = basicData.leftUsers.length;
    }

    drawCount = Math.min(drawCount, leftCount, totalRemaining);
    if (drawCount <= 0) {
      addQipao("当前无法抽取更多人员。");
      setLotteryStatus(false);
      btns.lottery.innerHTML = "开始抽奖";
      return;
    }

    for (let i = 0; i < drawCount; i++) {
      if (totalRemaining <= 0 || leftCount <= 0) {
        break;
      }
      let luckyId = random(leftCount);
      const luckyUser = basicData.leftUsers.splice(luckyId, 1)[0];
      leftCount--;

      const prize = pickPrizeByWeight(remainingMap);
      if (!prize) {
        break;
      }
      remainingMap[prize.type] = Math.max(0, (remainingMap[prize.type] || 0) - 1);
      totalRemaining--;

      currentLuckys.push({
        user: luckyUser,
        prize,
        revealed: false
      });

      let cardIndex = random(TOTAL_CARDS);
      let attempts = 0;
      let shownDrawnTip = false;
      while (
        (selectedCardIndex.includes(cardIndex) || drawnCardIndex.has(cardIndex)) &&
        attempts < TOTAL_CARDS * 2
      ) {
        if (drawnCardIndex.has(cardIndex) && !shownDrawnTip) {
          addQipao("该卡片已被抽取，请再抽一次。");
          shownDrawnTip = true;
        }
        cardIndex = random(TOTAL_CARDS);
        attempts++;
      }
      if (attempts >= TOTAL_CARDS * 2) {
        addQipao("可用卡片不足，请重置后再抽奖。");
        break;
      }
      selectedCardIndex.push(cardIndex);
    }

    updatePrizeUI(false);
    selectCard();
  });
}

/**
 * 保存上一次的抽奖结果
 */
function saveData() {
  if (!currentLuckys || currentLuckys.length === 0) {
    return Promise.resolve();
  }

  const revealedLuckys = currentLuckys.filter(item => item && item.revealed);
  if (revealedLuckys.length === 0) {
    return Promise.resolve();
  }

  const group = {};
  revealedLuckys.forEach(item => {
    if (!item || !item.prize) {
      return;
    }
    const type = item.prize.type;
    if (!group[type]) {
      group[type] = [];
    }
    group[type].push(item.user);
  });

  Object.keys(group).forEach(type => {
    const curLucky = basicData.luckyUsers[type] || [];
    basicData.luckyUsers[type] = curLucky.concat(group[type]);
  });

  currentLuckys = currentLuckys.filter(item => !item || !item.revealed);

  updatePrizeUI(false);

  const promises = Object.keys(group).map(type => setData(type, group[type]));
  return Promise.all(promises);
}

/**
 * 随机抽奖
 */
function random(num) {
  // Math.floor取到0-num-1之间数字的概率是相等的
  return Math.floor(Math.random() * num);
}

function pickPrizeByWeight(remainingMap) {
  const available = basicData.prizes.filter(
    prize => (remainingMap[prize.type] || 0) > 0
  );
  if (available.length === 0) {
    return null;
  }
  const total = available.reduce((sum, prize) => {
    return sum + (remainingMap[prize.type] || 0);
  }, 0);
  let roll = random(total);
  for (let i = 0; i < available.length; i++) {
    const prize = available[i];
    roll -= remainingMap[prize.type] || 0;
    if (roll < 0) {
      return prize;
    }
  }
  return available[available.length - 1];
}

function setCardPrizeData(card, prize) {
  if (!card) {
    return;
  }
  card.dataset.prizeText = prize && prize.text ? prize.text : "";
  card.dataset.prizeTitle = prize && prize.title ? prize.title : "";
  card.dataset.prizeImg = prize && prize.img ? prize.img : "";
  card.dataset.prizeType = prize && prize.type !== undefined ? prize.type : "";
  card.dataset.prizeCount = prize && prize.count ? prize.count : "";
}

/**
 * 切换名牌信息
 */
function changeCard(cardIndex, prize) {
  let card = threeDCards[cardIndex].element;
  setCardPrizeData(card, prize);
  renderCardFront(card);
}

function setCardWinnerData(cardIndex, prize) {
  let card = threeDCards[cardIndex].element;
  setCardPrizeData(card, prize);
  card.dataset.revealed = "0";
  card.dataset.revealable = "1";
  card.classList.add("revealable");
  renderCardBackPlaceholder(card);
}

/**
 * 切换名牌背景
 */
function shine(cardIndex, color) {
  let card = threeDCards[cardIndex].element;
  card.style.backgroundColor =
    color || "rgba(0,127,127," + (Math.random() * 0.7 + 0.25) + ")";
}

/**
 * 随机切换背景和人员信息
 */
function shineCard() {
  let maxCard = 10,
    maxUser;
  let shineCard = 10 + random(maxCard);

  setInterval(() => {
    // 正在抽奖停止闪烁
    if (isLotting) {
      return;
    }
    maxUser = basicData.leftUsers.length;
    for (let i = 0; i < shineCard; i++) {
      let cardIndex = random(TOTAL_CARDS);
      // 当前显示的已抽中名单不进行随机切换
      if (selectedCardIndex.includes(cardIndex)) {
        continue;
      }
      shine(cardIndex);
      if (basicData.prizes && basicData.prizes.length > 0) {
        let prizeIndex = random(basicData.prizes.length);
        changeCard(cardIndex, basicData.prizes[prizeIndex]);
      }
    }
  }, 500);
}

function setData(type, data) {
  return new Promise((resolve, reject) => {
    window.AJAX({
      url: "/saveData",
      data: {
        type,
        data
      },
      success() {
        resolve();
      },
      error() {
        reject();
      }
    });
  });
}

function setErrorData(data) {
  return new Promise((resolve, reject) => {
    window.AJAX({
      url: "/errorData",
      data: {
        data
      },
      success() {
        resolve();
      },
      error() {
        reject();
      }
    });
  });
}

function exportData() {
  window.AJAX({
    url: "/export",
    success(data) {
      if (data.type === "success") {
        location.href = data.url;
      }
    }
  });
}

function reset() {
  window.AJAX({
    url: "/reset",
    success(data) {
      console.log("重置成功");
    }
  });
}

function createHighlight() {
  let year = new Date().getFullYear() + "";
  let step = 4,
    xoffset = 1,
    yoffset = 1,
    highlight = [];

  year.split("").forEach(n => {
    highlight = highlight.concat(
      NUMBER_MATRIX[n].map(item => {
        return `${item[0] + xoffset}-${item[1] + yoffset}`;
      })
    );
    xoffset += step;
  });

  return highlight;
}

let onload = window.onload;

window.onload = function () {
  onload && onload();

  let music = document.querySelector("#music");

  let rotated = 0,
    stopAnimate = false,
    musicBox = document.querySelector("#musicBox");

  function animate() {
    requestAnimationFrame(function () {
      if (stopAnimate) {
        return;
      }
      rotated = rotated % 360;
      musicBox.style.transform = "rotate(" + rotated + "deg)";
      rotated += 1;
      animate();
    });
  }

  musicBox.addEventListener(
    "click",
    function (e) {
      if (music.paused) {
        music.play().then(
          () => {
            stopAnimate = false;
            animate();
          },
          () => {
            addQipao("背景音乐自动播放失败，请手动播放！");
          }
        );
      } else {
        music.pause();
        stopAnimate = true;
      }
    },
    false
  );

  setTimeout(function () {
    musicBox.click();
  }, 1000);
};
// ========== 抽奖名单上传与奖项配置 ===========

// 上传名单弹窗逻辑
const uploadUserBtn = document.getElementById('uploadUserBtn');
const uploadUserModal = document.getElementById('uploadUserModal');
const userExcelInput = document.getElementById('userExcelInput');
const userExcelUpload = document.getElementById('userExcelUpload');
const closeUploadUser = document.getElementById('closeUploadUser');
const uploadUserMsg = document.getElementById('uploadUserMsg');

if (uploadUserBtn && uploadUserModal && uploadUserMsg) {
  uploadUserBtn.onclick = () => {
    uploadUserModal.style.display = 'block';
    uploadUserMsg.innerHTML = '';
  };
}
if (closeUploadUser && uploadUserModal) {
  closeUploadUser.onclick = () => {
    uploadUserModal.style.display = 'none';
  };
}
if (userExcelUpload && userExcelInput && uploadUserMsg) {
  userExcelUpload.onclick = () => {
    const file = userExcelInput.files[0];
    if (!file) {
      uploadUserMsg.innerHTML = '请选择 Excel 文件';
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    fetch('/upload_users', {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          uploadUserMsg.innerHTML = `上传成功，名单人数：${data.count}`;
        } else {
          uploadUserMsg.innerHTML = data.error || '上传失败';
        }
      })
      .catch(() => {
        uploadUserMsg.innerHTML = '上传失败';
      });
  };
}

// 奖项配置弹窗逻辑
const prizeConfigBtn = document.getElementById('prizeConfigBtn');
const prizeConfigModal = document.getElementById('prizeConfigModal');
const prizeConfigList = document.getElementById('prizeConfigList');
const prizeConfigForm = document.getElementById('prizeConfigForm');
const closePrizeConfig = document.getElementById('closePrizeConfig');
const prizeConfigMsg = document.getElementById('prizeConfigMsg');

if (prizeConfigBtn && prizeConfigModal && prizeConfigMsg) {
  prizeConfigBtn.onclick = () => {
    prizeConfigModal.style.display = 'block';
    prizeConfigMsg.innerHTML = '';
    // 获取当前奖项配置
    fetch('/get_prizes_config')
      .then(res => res.json())
      .then(data => {
        renderPrizeConfig(data.prizes || []);
      });
  };
}
if (closePrizeConfig && prizeConfigModal) {
  closePrizeConfig.onclick = () => {
    prizeConfigModal.style.display = 'none';
  };
}

function renderPrizeConfig(prizes) {
  prizeConfigList.innerHTML = '';
  prizes.forEach((prize, idx) => {
    const div = document.createElement('div');
    div.style.marginBottom = '10px';
    div.innerHTML = `
      <label>奖项名称: <input type="text" name="title${idx}" value="${prize.title || ''}" /></label>
      <label>数量: <input type="number" name="count${idx}" value="${prize.count || 1}" min="1" style="width:60px;" /></label>
      <label>图片: <input type="file" name="img${idx}" accept="image/*" /></label>
      <img src="${prize.img || ''}" alt="奖项图片" style="max-width:60px;max-height:60px;vertical-align:middle;" />
    `;
    prizeConfigList.appendChild(div);
  });
}

if (prizeConfigForm && prizeConfigList && prizeConfigMsg) {
  prizeConfigForm.onsubmit = function (e) {
    e.preventDefault();
    const form = e.target;
    const items = prizeConfigList.children;
    let promises = [];
    let prizes = [];
    for (let i = 0; i < items.length; i++) {
      const title = form[`title${i}`].value;
      const count = parseInt(form[`count${i}`].value);
      const imgInput = form[`img${i}`];
      let imgUrl = items[i].querySelector('img').src;
      if (imgInput && imgInput.files[0]) {
        // 上传图片
        const fd = new FormData();
        fd.append('file', imgInput.files[0]);
        promises.push(
          fetch('/upload_prize_img', {
            method: 'POST',
            body: fd
          })
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                imgUrl = data.url;
              }
            })
        );
      }
      prizes.push({ title, count, img: imgUrl });
    }
    Promise.all(promises).then(() => {
      fetch('/set_prizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prizes })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            prizeConfigMsg.innerHTML = '保存成功';
          } else {
            prizeConfigMsg.innerHTML = '保存失败';
          }
        });
    });
  };
}