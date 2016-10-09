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

export function doOnlySecond(first, second, f) {
  for (let v of second) {
    if(first.indexOf(v) === -1) {
      f(v);
    }
  }
  return first;
}
