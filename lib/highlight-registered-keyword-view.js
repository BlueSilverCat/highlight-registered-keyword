'use babel';

import HRK from './highlight-registered-keyword';
import {appendSpan, replaceEle, countSpan} from './utility';

export default class HighlightRegisteredKeywordView {

  constructor() {
    this.name = 'highlight-registered-keyword-view';
    this.element = document.createElement('div');
    this.element.id = HRK.name;
    this.currentUl = null;
    this.currentDiv = null;

    this.kFontSize = 10; //px
    this.kMaxWidth = 800;  //px
    this.kMaxHeight = 600; //px
  }

  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

  br(){
    return document.createElement('br');
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
      appendSpan(div, 'configFilePath: ', configs.configFilePath, true);
      appendSpan(div, 'disableConfigFilePath: ', configs.disableConfigFilePath, true);
    }
    appendSpan(div, 'delay: ', configs.delay, true);
    appendSpan(div, 'disableUpdate: ', configs.disableUpdate, false);
    replaceEle(this.element, this.currentDiv, div);
    this.currentDiv = div;
  }

  makeUl(configs){
    let ul = document.createElement('ul');

    for(let pattern of configs.patterns) {
      let li = document.createElement('li');

      li.classList.add(HRK.name + '_patterns');
      appendSpan(li, 'class: ', pattern.class, true);
      appendSpan(li, 'pattern: ', pattern.pattern, false);
      ul.appendChild(li);
    }
    replaceEle(this.element, this.currentUl, ul);
    this.currentUl = ul;
  }

  resize() {
    let spanCount = countSpan(this.element, null);
    let height = (spanCount.number * this.kFontSize * 2 + this.kFontSize ) > this.kMaxHeight
      ? this.kMaxHeight.toString() + "px" : (spanCount.number * this.kFontSize * 2 + this.kFontSize ).toString() + "px";
    let width = (spanCount.maxLength * this.kFontSize) > this.kMaxWidth
      ? this.kMaxWidth.toString() + "px" : (spanCount.maxLength * this.kFontSize).toString() + "px";

    this.element.style.height = height;
    this.element.style.width = width;
  }
}
