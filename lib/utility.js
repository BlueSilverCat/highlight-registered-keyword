'use babel';

export class FileConfigs {
  constructor() {
    this.delay = 0;
    this.disableUpdate = false;
    this.patterns = [];
  }
}
export class Configs extends FileConfigs {
  constructor() {
    super();
    this.configFilePath = "";
    this.configFilePathIsValid = false;
    this.disableConfigFilePath = false;
  }
}
//////
export function doOnlySecond(self, first, second, func) {
  const kErr = -1;

  for (let v of second) {
    if(first.indexOf(v) === kErr) {
      func.call(self, v);
    }
  }
  return first;
}

export function checkInteger(num, minimum, maximam){
  if( Number.isInteger(num) === false || minimum&&(num < minimum) || maximam&&(num > maximam)) {
    return false;
  }
  return true;
}

export function checkBoolean(bool){
  return bool === "true" ? true : false;
}

function unicodeEscapeSequenceReplacer(match, p1, offset, string){
  return String.fromCodePoint(parseInt(p1, 16));
}

export function unicodeEscapeSequenceToChar(string) {
  const kUnicode = /\\u{?([A-Fa-f0-9]+)}?/g;

  return string.replace(kUnicode, unicodeEscapeSequenceReplacer);
}

export function stringToRegex(string) {
  const kCheckRegex1 = /\/(.*)\/(.*)/;   //use this forconvert string to Regex
  const kCheckRegex2 = /^[gimy]{0,4}$/;  //for check regular expression. whether flags are valid or not
  const kCheckRegex3 = /(.).*?\1/;       //for check regular expression. whether flags are duplicate or not
  let match = kCheckRegex1.exec(string);

  if ( match !== null
    && match[1] !== ''
    && kCheckRegex2.test(match[2])  //flag checking
    && !kCheckRegex3.test(match[2]) //duplicate
  ) {
    return new RegExp(match[1], match[2]);
  }
  return null;
}

export function appendSpan(target, str, data, addbr) {
  let span = document.createElement('span');

  span.textContent = str + data.toString();
  target.appendChild(span);
  if(addbr){
    target.appendChild(document.createElement('br'));
  }
}

export function replaceEle(target, oldEle, newEle) {
  if(oldEle === null) {
    target.appendChild(newEle);
  } else {
    target.replaceChild(newEle, oldEle);
  }
}

export function countSpan(ele, count){
  let elelist = ele.children, tmp = null;

  if(count === null){
    tmp = {maxLength: 0, number: 0};
  } else {
    tmp = count;
  }

  for(let i = 0; i < elelist.length; ++i) {
    if(elelist[i].tagName === "SPAN") {
      tmp.number += 1;
      tmp.maxLength = tmp.maxLength > elelist[i].textContent.length ? tmp.maxLength : elelist[i].textContent.length;
    }
    tmp = countSpan(elelist[i], tmp);
  }
  return tmp;
}
