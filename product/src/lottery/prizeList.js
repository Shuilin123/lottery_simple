const MAX_TOP = 300,
  MAX_WIDTH = document.body.clientWidth;

let prizes;
const DEFAULT_MESS = [
  "我是该抽中一等奖还是一等奖呢，纠结ing...",
  "听说要提前一个月吃素才能中大奖喔！",
  "好想要一等奖啊！！！",
  "一等奖有没有人想要呢？",
  "五等奖也不错，只要自己能中奖就行",
  "祝大家新年快乐！",
  "中不中奖不重要，大家吃好喝好。",
  "新年，祝福大家事事顺遂。",
  "作为专业陪跑的我，我就看看你们有谁跟我一样",
  "新的一年祝福大家越来越好！",
  "来年再战！！！"
];

let lastDanMuList = [];

let prizeElement = {};
class DanMu {
  constructor(option) {
    if (typeof option !== "object") {
      option = {
        text: option
      };
    }

    this.position = {};
    this.text = option.text;
    this.onComplete = option.onComplete;

    this.init();
  }

  init() {
    this.element = document.createElement("div");
    this.element.className = "dan-mu";
    document.body.appendChild(this.element);

    this.start();
  }

  setText(text) {
    this.text = text || this.text;
    this.element.textContent = this.text;
    this.width = this.element.clientWidth + 100;
  }

  start(text) {
    let speed = ~~(Math.random() * 10000) + 6000;
    this.position = {
      x: MAX_WIDTH
    };
    let delay = speed / 10;

    this.setText(text);
    this.element.style.transform = "translateX(" + this.position.x + "px)";
    this.element.style.top = ~~(Math.random() * MAX_TOP) + 10 + "px";
    this.element.classList.add("active");
    this.tween = new TWEEN.Tween(this.position)
      .to(
        {
          x: -this.width
        },
        speed
      )
      .onUpdate(() => {
        this.render();
      })
      .onComplete(() => {
        this.onComplete && this.onComplete();
      })
      .start();
  }

  render() {
    this.element.style.transform = "translateX(" + this.position.x + "px)";
  }
}

class Qipao {
  constructor(option) {
    if (typeof option !== "object") {
      option = {
        text: option
      };
    }

    this.text = option.text;
    this.onComplete = option.onComplete;
    this.$par = document.querySelector(".qipao-container");
    if (!this.$par) {
      this.$par = document.createElement("div");
      this.$par.className = "qipao-container";
      document.body.appendChild(this.$par);
    }

    this.init();
  }

  init() {
    this.element = document.createElement("div");
    this.element.className = "qipao animated";
    this.$par.appendChild(this.element);

    this.start();
  }

  setText(text) {
    this.text = text || this.text;
    this.element.textContent = this.text;
  }

  start(text) {
    this.setText(text);
    this.element.classList.remove("bounceOutRight");
    this.element.classList.add("bounceInRight");

    setTimeout(() => {
      this.element.classList.remove("bounceInRight");
      this.element.classList.add("bounceOutRight");
      this.onComplete && this.onComplete();
    }, 4000);
  }
}

let addQipao = (() => {
  let qipaoList = [];
  return function (text) {
    let qipao;
    if (qipaoList.length > 0) {
      qipao = qipaoList.shift();
    } else {
      qipao = new Qipao({
        onComplete() {
          qipaoList.push(qipao);
        }
      });
    }

    qipao.start(text);
  };
})();

function setPrizes(pri) {
  prizes = pri || [];
}

function shuffleList(list) {
  const arr = (list || []).slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showPrizeList(totalLeft) {
  prizeElement = {};
  let htmlCode = `<div class="prize-mess">本轮抽奖<label id="prizeType" class="prize-shine">好运开奖</label><label id="prizeText" class="prize-shine">请点击卡片揭晓</label>，剩余<label id="prizeLeft" class="prize-shine">${
    totalLeft
  }</label>个</div><ul class="prize-list">`;
  const randomPrizes = shuffleList(prizes);
  randomPrizes.forEach(item => {
    htmlCode += `<li id="prize-item-${item.type}" class="prize-item prize-item-hidden">
                        <span></span><span></span><span></span><span></span>
                        <div class="prize-img">
                            <img src="${item.img}" alt="${item.title}">
                        </div>
                        <div class="prize-text">
                            <h5 class="prize-title">${item.text} ${
      item.title
    }</h5>
                            <div class="prize-count">
                                <div class="progress">
                                    <div id="prize-bar-${
                                      item.type
                                    }" class="progress-bar progress-bar-danger progress-bar-striped active" style="width: 100%;">
                                    </div>
                                </div>
                                <div id="prize-count-${
                                  item.type
                                }" class="prize-count-left">
                                    ${item.count + "/" + item.count}
                                </div>
                            </div>
                        </div>
                    </li>`;
  });
  htmlCode += `</ul>`;

  const prizeBar = document.querySelector("#prizeBar");
  if (prizeBar) {
    prizeBar.innerHTML = htmlCode;
  }

  prizeElement.prizeType = document.querySelector("#prizeType");
  prizeElement.prizeLeft = document.querySelector("#prizeLeft");
  prizeElement.prizeText = document.querySelector("#prizeText");
}

function resetPrize(totalLeft) {
  prizeElement = {};
  showPrizeList(totalLeft || 0);
}

let setPrizeData = (function () {
  return function (type, leftCount, totalCount) {
    const currentPrize = prizes.find(item => String(item.type) === String(type));
    const maxCount =
      totalCount !== undefined && totalCount !== null
        ? totalCount
        : currentPrize
        ? currentPrize.count
        : 0;
    let elements = prizeElement[type];

    if (!elements) {
      elements = {
        box: document.querySelector(`#prize-item-${type}`),
        bar: document.querySelector(`#prize-bar-${type}`),
        text: document.querySelector(`#prize-count-${type}`)
      };
      prizeElement[type] = elements;
    }

    if (!elements || !elements.bar || !elements.text) {
      return;
    }

    const count = Math.max(0, leftCount || 0);
    const total = Math.max(0, maxCount || 0);
    const percent = total === 0 ? 0 : (count / total).toFixed(2);
    elements.bar.style.width = percent * 100 + "%";
    elements.text.textContent = count + "/" + total;
    if (elements.box) {
      if (count <= 0) {
        elements.box.classList.add("done");
        elements.box.classList.remove("prize-item-hidden");
        elements.box.classList.remove("prize-item-reveal");
        void elements.box.offsetWidth;
        elements.box.classList.add("prize-item-reveal");
      } else {
        elements.box.classList.remove("done");
        elements.box.classList.remove("prize-item-reveal");
        elements.box.classList.add("prize-item-hidden");
      }
    }
  };
})();

function setPrizeSummary(totalLeft) {
  if (!prizeElement.prizeLeft) {
    prizeElement.prizeLeft = document.querySelector("#prizeLeft");
  }
  if (prizeElement.prizeLeft) {
    prizeElement.prizeLeft.textContent = totalLeft;
  }
}

function startMaoPao() {
  let len = DEFAULT_MESS.length,
    count = 5,
    index = ~~(Math.random() * len),
    danmuList = [],
    total = 0;

  function restart() {
    total = 0;
    danmuList.forEach(item => {
      let text =
        lastDanMuList.length > 0
          ? lastDanMuList.shift()
          : DEFAULT_MESS[index++];
      item.start(text);
      index = index > len ? 0 : index;
    });
  }

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      danmuList.push(
        new DanMu({
          text: DEFAULT_MESS[index++],
          onComplete: function () {
            setTimeout(() => {
              this.start(DEFAULT_MESS[index++]);
              index = index > len ? 0 : index;
            }, 1000);
          }
        })
      );
      index = index > len ? 0 : index;
    }, 1500 * i);
  }
}

function addDanMu(text) {
  lastDanMuList.push(text);
}

export {
  startMaoPao,
  showPrizeList,
  setPrizeData,
  setPrizeSummary,
  addDanMu,
  setPrizes,
  resetPrize,
  addQipao
};
