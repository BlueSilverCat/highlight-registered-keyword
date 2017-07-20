"use babel";

import { appendSpan, replaceEle } from "./utilities/html-utility";
import HRK from "./highlight-registered-keyword";

export default class HighlightRegisteredKeywordView {
  constructor() {
    this.name = "highlight-registered-keyword-view";
    this.element = document.createElement("div");
    this.element.id = HRK.name;
    this.currentUl = null;
    this.currentDiv = null;
  }

  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

  getTitle() {
    return "ValidConfigs";
  }

  makeElement(configs) {
    this.makeDiv(configs);
    this.makeUl(configs);
  }

  makeDiv(configs) {
    let div = document.createElement("div");

    appendSpan(div, "patternsFilePath: ", configs.patternsFilePath, true);
    appendSpan(div, "delay: ", configs.delay, true);
    appendSpan(div, "disableUpdate: ", configs.disableUpdate, false);
    replaceEle(this.element, this.currentDiv, div);
    this.currentDiv = div;
  }

  makeUl(configs) {
    let ul = document.createElement("ul");

    for (let pattern of configs.patterns) {
      let li = document.createElement("li");

      li.classList.add(HRK.name, "patterns");
      appendSpan(li, "class: ", pattern.class, true);
      appendSpan(li, "pattern: ", pattern.pattern, true);
      appendSpan(li, "disable: ", pattern.disable, false);
      ul.appendChild(li);
    }
    replaceEle(this.element, this.currentUl, ul);
    this.currentUl = ul;
  }
}
