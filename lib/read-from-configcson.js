'use babel';

import HRK from './highlight-registered-keyword';
import {FileConfigs, checkInteger, checkBoolean, unicodeEscapeSequenceToChar} from './utility';

import fs from 'fs';
import cson from 'cson';

export default {
  name: "file",

  readFromConfigFile(path, objName, resolved, rejected) {
    if(path === null) {
      return;
    }
    let promise = new Promise( (resolve, reject) => {
      fs.readFile(path, 'utf-8', (err, data) => {
        if(err) {
          reject(err);
          return;
        }
        let result = this.stringToCson(data, objName);

        if(result instanceof Error) {
          reject(result);
          return;
        }
        resolve(result);
      });
    });
    promise.then(resolved).catch(rejected);
  },

  stringToCson(data, objName) {
    //console.log("_stringToCson");
    let obj = cson.parse(unicodeEscapeSequenceToChar(data));

    if(obj instanceof Error) {
      return obj;
    }
    let configs = new FileConfigs();

    obj = obj[objName];
    if(obj.hasOwnProperty("delay") && checkInteger(obj.delay, HRK.kMinimumDelay, HRK.kMaximumDelay)) {
      configs.delay = obj.delay;
    }
    if(obj.hasOwnProperty("disableUpdate")) {
      configs.disableUpdate = checkBoolean(obj.disableUpdate);
    }
    if(obj.hasOwnProperty("patterns")) {
      configs.patterns = obj.patterns;//HRK.patternsToRegex(obj.patterns);
    }
    return configs;
  }
}
