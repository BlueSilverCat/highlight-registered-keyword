'use babel';

import {shallowCopyTargetProperty, unicodeEscapeSequenceToChar, stringToRegex, replace } from './utility';

import fs from 'fs';
import cson from 'cson';

export default {
  name: "read-from-configcson",

  readFromConfigFile(path, objName, resolved, rejected) {
    if(path === null) {
      return;
    }
    let promise = new Promise( (resolve, reject) => {
      fs.readFile(path, 'utf-8', (err, data) => {
        if(err) {
          reject([err, 0]);
          return;
        }
        let result = this.stringToCson(data, objName);

        if(result instanceof Error) {
          reject([result, 1]);
          return;
        }
        resolve(result);
      });
    });
    promise.then(resolved, rejected);
  },

  stringToCson(data, objName) {
    let obj = cson.parse(unicodeEscapeSequenceToChar(data));

    if(obj instanceof Error) {
      return obj;
    }

    if(obj.hasOwnProperty(objName) === false) {
      return [new Pattern()];
    }

    obj = obj[objName];
    let patterns = [];

    for(let i = 0; i < obj.length; ++i) {
      let pattern = new Pattern();

      shallowCopyTargetProperty(pattern, obj[i]);
      //pattern.pattern = replace(pattern.pattern, '(', '(?:', '\\', '?'); //capture group to non-capture group \1という使い方が出来なくなるので削除
      pattern.pattern = stringToRegex(pattern.pattern);

      if(pattern.pattern === null || typeof pattern.disable !== 'boolean' || typeof pattern.class !== 'string'
        || Object.prototype.toString.call(pattern.fileTypes) !== '[object Array]') {
        return new Error(`${i}th pattern is invalid.`);
      }
      pattern.class = objName + ' ' + pattern.class;
      patterns.push(pattern);
    }

    return patterns;
  }
}

export class Pattern {
  constructor() {
    this.pattern = '';
    this.class = 'default';
    this.disable = false;
    this.fileTypes = ['*'];
  }
}

export class Configs {
  constructor() {
    this.patternsFilePath = '';
    this.delay = 0;
    this.disableUpdate = false;
    this.patterns = [];
    this.autoMark = false;
  }
}

export class EditorState {
  constructor(editor) {
    this.editor = editor ? editor : null;
    this.marked = false;
    this.subscriptionChange = null;
    this.subscriptionDestroy = null;
    this.subscriptionGrammar = null;
    this.fileTypes = [];
    this.markerIds = []; //{id:, pattern:}
  }

  dispose() {
    if(this.subscriptionChange !== null) {
      this.subscriptionChange.dispose();
      this.subscriptionChange = null;
    }
    if(this.subscriptionDestroy !== null) {
      this.subscriptionDestroy.dispose();
      this.subscriptionDestroy = null;
    }
    if(this.subscriptionGrammar !== null) {
      this.subscriptionGrammar.dispose();
      this.subscriptionGrammar = null;
    }
  }

  disposeChange() {
    if(this.subscriptionChange !== null) {
      this.subscriptionChange.dispose();
      this.subscriptionChange = null;
    }
  }
}
