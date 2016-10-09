'use babel';

import HRK from './highlight-registered-keyword';

export default class HighlightRegisteredKeywordView {

  constructor(serializedState) {
    this.name = 'highlight-registered-keyword-view';
    this.element = document.createElement('div');
    this.element.id = HRK.name;
    this.currentUl= null;
    this.currentDiv= null;

    this.kFontSize = 10; //px
    this.kMaxWidth = 800;  //px
    this.kMaxHeight = 600; //px
  }

  serialize() {}

  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

  br(){
    return document.createElement('br');
  }

  appendSpan(target, str, data, addbr) {
    let span = document.createElement('span');

    span.textContent = str + data.toString();
    target.appendChild(span);
    if(addbr){
      target.appendChild(document.createElement('br'));
    }
  }

  replaceEle(oldEle, newEle) {
    if(oldEle === null) {
      this.element.appendChild(newEle);
    } else {
      this.element.replaceChild(newEle, oldEle);
    }
  }

  countSpan(ele, out){
    let elelist = ele.children;

    for(let i = 0; i < elelist.length; ++i) {
      if(elelist[i].tagName === "SPAN") {
        out.number += 1;
        out.maxLength = out.maxLength > elelist[i].textContent.length ? out.maxLength : elelist[i].textContent.length;
      }
      this.countSpan(elelist[i], out);
    }
  }

  makeElement(configs) {
    //console.log(configs);
    this.makeDiv(configs);
    this.makeUl(configs);
    this.resize();
  }

  makeDiv(configs) {
    let div = document.createElement('div');

    if(configs.configFilePathIsValid) {
      this.appendSpan(div, 'configFilePath: ', configs.configFilePath, true);
      this.appendSpan(div, 'disableConfigFilePath: ', configs.disableConfigFilePath, true);
    }
    this.appendSpan(div, 'delay: ', configs.delay, true);
    this.appendSpan(div, 'disableUpdate: ', configs.disableUpdate, false);
    this.replaceEle(this.currentDiv, div);
    this.currentDiv = div;
  }

  makeUl(configs){
    let ul = document.createElement('ul');

    for(let pattern of configs.patterns) {
      let li = document.createElement('li');

      li.classList.add(HRK.name + '_patterns');
      this.appendSpan(li, 'class: ', pattern.class, true);
      this.appendSpan(li, 'pattern: ', pattern.pattern, false);
      ul.appendChild(li);
    }
    this.replaceEle(this.currentUl, ul);
    this.currentUl = ul;
  }
  resize() {
    let spanCount = {maxLength: 0, number: 0};

    this.countSpan(this.element, spanCount);
    let height = (spanCount.number * this.kFontSize * 2 + this.kFontSize ) > this.kMaxHeight
      ? this.kMaxHeight.toString() + "px" : (spanCount.number * this.kFontSize * 2 + this.kFontSize ).toString() + "px";
    let width = (spanCount.maxLength * this.kFontSize) > this.kMaxWidth
      ? this.kMaxWidth.toString() + "px" : (spanCount.maxLength * this.kFontSize).toString() + "px";

    this.element.style.height = height;
    this.element.style.width = width;
  }
}
