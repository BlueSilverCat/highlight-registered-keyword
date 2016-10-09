'use babel';

import HRK from './highlight-registered-keyword';
import RFC from './readfromconfigcson';
import {FileConfigs} from './utility';

var fs = require('fs');
var cson = require('cson');

export default {
  name: "file",

  readFromConfigFile(path) {
    if(path === null) {
      return null;
    }
    return new Promise( (resolve, reject) => {
      fs.readFile(path, 'utf-8', (err, data) => {
        if(err) {
          reject(err);
          return;
        }
        let result = this._stringToCson(data);

        if(result instanceof Error) {
          reject(result);
          return;
        }
        resolve(result);
      });
    }
  )

  },

  _stringToCson(data) {
    //console.log("_stringToCson");
    let obj = cson.parse(RFC._UnicodeEscapeSequenceToChar(data));

    if(obj instanceof Error) {
      return obj;
    }
    let configs = new FileConfigs();

    obj = obj[HRK.name];
    if(obj.hasOwnProperty("delay") && RFC._checkInteger(obj.delay)) {
      configs.delay = obj.delay;
    }
    if(obj.hasOwnProperty("disableUpdate")) {
      configs.disableUpdate = RFC._checkBoolean(obj.disableUpdate);
    }
    if(obj.hasOwnProperty("patterns")) {
      configs.patterns = HRK.patternsToRegex(obj.patterns);
    }
    return configs;
  },

  _checkInteger(num){
    if( Number.isInteger(num) === false || num < HRK.kMinimumDelay || num > HRK.kMaximumDelay) {
      return false;
    }
    return true;
  },

  _checkBoolean(bool){
    return bool === "true" ? true : false;
  },

  _UnicodeEscapeSequenceToChar(string) {
    let unicode = /\\u{?([A-Fa-f0-9]+)}?/g;

    //console.log("_UnicodeEscapeSequenceToChar");
    return string.replace(unicode, RFC._replacer);
  },

  _replacer(match, p1, offset, string){
    //console.log(match);
    return String.fromCodePoint(parseInt(p1, 16));
  }
}
