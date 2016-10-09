'use babel';

import HRK from './highlight-registered-keyword';
import HRKV from './highlight-registered-keyword-view';
import RFC from './readfromconfigcson';
import {Configs, FileConfigs, doOnlySecond} from './utility';
import { CompositeDisposable, File as AFile } from 'atom';

export default {
  config: {
    configFilePath: {
      type: 'string',
      description: "Specify the CSON file that describing configuration. This file's configuration overrides the config.cson.<br>If do not set this, use config.cson as configuration.",
      //description: "config file path or directory that contains hrk.config. It will only be used when there's no config file in project",
      'default': ''
    },
    disableConfigFilePath: {
      type: 'boolean',
      description: "If set this, use config.cson instead of configFilePath even if it's a valid.",
      'default': false
    },
    delay: {
      type: 'integer',
      description: 'delay time for update(ms)',
      'default': 1500,
      minimum: 0,
      maximum: 5000
    },
    disableUpdate: {
      type: 'boolean',
      description: 'If set this, highlighting update will be disabled',
      'default': false
    },
    patterns: {
      type: 'array',
      'default': [],
      //'default': [{pattern: '/#.*/g', 'class': 'comment'}, {pattern: '///.*/g', 'class': 'comment'}],
      //description: 'Array of Object. Object properties are pattern and class. pattern is a string that is quoted regular expression. class is a string that is represent CSS class.',
      items: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            'default': ''
          },
          'class': {
            type: 'string',
            'default': ''
          }
        }
      }
    }
  },

  name: 'highlight-registered-keyword',
  subscriptions: null,
  editorSubscriptions: {}, //associative array
  fileSubscription: null,
  configfile: null,
  toggled: false, //flag for toggle
  editors: [],
  timerId: null,  //Timer ID
  changedRange: [[Number.MAX_VALUE, 0], [0, 0]],
  view: null,
  modalPanel: null,

  currentConfigs: null,
  configCson: null,    //configs from config.cson
  importedConfigs: null,

  kInvalidate: 'never', // never or inside
  kCheckRegex1: /\/(.*)\/(.*)/,   //use this forconvert string to Regex
  kCheckRegex2: /^[gimy]{0,4}$/,  //for check regular expression. whether flags are valid or not
  kCheckRegex3: /(.).*?\1/,       //for check regular expression. whether flags are duplicate or not
  kMinimumDelay: 0,
  kMaximumDelay: 5000,

  activate(state) {
    //console.log('activate')
    this.initalize();

    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'highlight-registered-keyword:toggle': () => this.toggle(),
      'highlight-registered-keyword:show': () => this.show()
    }));

    this.view = new HRKV(state.HRKVState);
    /*this.subscriptions.add(atom.views.addViewProvider((model) => {     //正しいのか分からない
      return model.view;
    }));*/
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.view.getElement(),
      //item: this.view,
      visible: false
    });

    this.getConfigs();
    this._setConfigs();
    let promise = RFC.readFromConfigFile(this.currentConfigs.configFilePath);
    promise.then(this._setImportedConfigs, this._setImportedConfigsInvalid);
  },

  initalize() {
    this.subscriptions = null;
    this.editorSubscriptions = {}; //associative array

    this.toggled = false;
    this.editors = [];
    this.timerId = null;
    this.changedRange = [[Number.MAX_VALUE, 0], [0, 0]];
    this.view = null;
    this.modalPanel = null;

    this.fileSubscription = null;
    this.configfile = null;

    this.currentConfigs = new Configs();
    this.configCson = new FileConfigs();    //configs from config.cson
    this.importedConfigs = new FileConfigs();//config from configFilePath
  },

  getConfigs() {
    this.currentConfigs.configFilePath = atom.config.get(this.name + '.configFilePath');
    this.currentConfigs.disableConfigFilePath = atom.config.get(this.name + '.disableConfigFilePath');

    this.configCson.patterns = this.patternsToRegex(atom.config.get(this.name + '.patterns'));
    this.configCson.delay = atom.config.get(this.name + '.delay');
    this.configCson.disableUpdate = atom.config.get(this.name + '.disableUpdate');

    this.subscriptions.add(atom.workspace.observeTextEditors(this._getTextEditors));
    this.subscriptions.add(atom.config.onDidChange(this.name + '.configFilePath', this._getConfigFilePath));
    this.subscriptions.add(atom.config.onDidChange(this.name + '.disableConfigFilePath', this._getDisableConfigFilePath));
    this.subscriptions.add(atom.config.onDidChange(this.name + '.patterns', this._getPatterns));
    this.subscriptions.add(atom.config.onDidChange(this.name + '.delay', this._getDelay));
    this.subscriptions.add(atom.config.onDidChange(this.name + '.disableUpdate', this._getDisableUpdate));
  },

  deactivate() {
    this.subscriptions.dispose();
    this._disposeEditorSubscriptions();
    if(this.toggled === true) {
      this._unmarkAllEditors(null);
    }
    if( this.timerId !== null) {
      clearTimeout(this.timerId);
    }
    this.modalPanel.destroy();
    this.view.destroy();
    this._fileDispose();
  },

  serialize() {
    //console.log('serialize');
    return {
      HRKVState: this.view.serialize()
    };
  },

  toggle() {
    //console.log('toggle');
    if(this.toggled === false) {
      this.toggled = true;
      this._markAllEditors(null);
    } else {
      this.toggled = false;
      this._unmarkAllEditors(null);
      if(this.modalPanel.isVisible()){
        this.modalPanel.hide();
      }
    }
  },

  show() {
    //console.log('show');
    if(!this.toggled) {
      return;
    }
    if( this.modalPanel.isVisible() ) {
      this.modalPanel.hide();
      return;
    }
    this.view.makeElement(this.currentConfigs);
    this.modalPanel.show();
  },

  stringToRegex(string) {
    let match = this.kCheckRegex1.exec(string);

    if ( match !== null
       && match[1] !== ''
       && this.kCheckRegex2.test(match[2])  //flag checking
       && !this.kCheckRegex3.test(match[2]) //duplicate
     ) {
      return new RegExp(match[1], match[2]);
    }
    return null;
  },

  patternsToRegex(patterns) {
    let result = null, cla = '', tmp = [];

    for(let pattern of patterns ) {
      result = HRK.stringToRegex(pattern.pattern);
      if(result) {
        cla = HRK._className(pattern.class)
        tmp.push({'class': cla, 'pattern': result});
      }
    }
    return tmp;
  },

  _mark(editor, pattern, range) {
    //console.log('_mark');
    editor.scanInBufferRange(pattern.pattern, range,
      (result) => {
        let marker = editor.markBufferRange(result.range, {invalidate: HRK.kInvalidate, class: pattern.class});

        editor.decorateMarker(marker, {type: 'highlight', class: pattern.class});
      }
    );
  },
  _markEditor(editor, range, pattern) {
    if(pattern !== null) {
      HRK._mark(editor, pattern, range);
    } else {
      for(let i = 0; i < HRK.currentConfigs.patterns.length; ++i) { //for...of
        HRK._mark(editor, HRK.currentConfigs.patterns[i], range);
      }
    }
  },
  _markAllEditors(pattern) {
    for(let i = 0; i < HRK.editors.length; ++i) { //for...of
      HRK._markEditor(HRK.editors[i], HRK.editors[i].getBuffer().getRange(), pattern)
    }
  },

  _unmark(editor, pattern, range) {
    let markers = [];

    //console.log('removeMark')
    markers = editor.findMarkers({containedInBufferRange: range, class: pattern.class})
    for(let i = 0; i < markers.length; ++i ){
      markers[i].destroy()
    }
  },

  _unmarkEditor(editor, range, pattern) {
    if(pattern !== null) {
      HRK._unmark(editor, pattern, range);
    }
    for(let i = 0; i< HRK.currentConfigs.patterns.length; ++i) {
      HRK._unmark(editor, HRK.currentConfigs.patterns[i], range);
    }
  },

  _unmarkAllEditors(pattern) {
    for(let i = 0; i < HRK.editors.length; ++i) {
      HRK._unmarkEditor(HRK.editors[i], HRK.editors[i].getBuffer().getRange(), pattern);
    }
  },

   //undefinedの場合はエラーとして扱うか? 現状はclassがundefinedとして登録される。
  _className(str) {
    return HRK.name + ' ' + str;
  },

  //行末を検出できればもっとよくなる
  _getChangedRange(evt) {
    let minR = 0, maxR = 0;//, minC = 0, maxC = 0;

    minR = Math.min(evt.oldRange.start.row, evt.oldRange.end.row,
      evt.newRange.start.row, evt.newRange.end.row, HRK.changedRange[0][0]);
    maxR = Math.max(evt.oldRange.start.row, evt.oldRange.end.row,
      evt.newRange.start.row, evt.newRange.end.row, HRK.changedRange[1][0]);
    //minC = Math.min(evt.oldRange.start.column, evt.oldRange.end.column,
    //  evt.newRange.start.column, evt.newRange.end.column, HRK.changedRange[0][1]);
    //maxC = Math.max(evt.oldRange.start.column, evt.oldRange.end.column,
    //  evt.newRange.start.column, evt.newRange.end.column, HRK.changedRange[1][1]);
    //HRK.changedRange = [[minR, 0], [maxR, maxC]];
    //get maxcolumn?.
    HRK.changedRange = [[minR, 0], [maxR + 1, 0]];
    return HRK.changedRange;
  },

  _change(range) {
    let editor = null;

    //console.log('_change');
    if(HRK.toggled === false || HRK.currentConfigs.disableUpdate === true){
      return;
    }
    editor = atom.workspace.getActiveTextEditor();
    if(!editor){
      return;
    }
    HRK._unmarkEditor(editor, range, null);
    HRK._markEditor(editor, range, null);
    HRK.changedRange = [[Number.MAX_VALUE, 0], [0, 0]];
    HRK.timerId = null;
  },

  _setTimer(evt) {
    //console.log('_setTimer')
    if( HRK.timerId !== null) {
      clearTimeout(HRK.timerId);
    }
    if( HRK.toggled === false || HRK.currentConfigs.disableUpdate === true){
      return;
    }
    HRK.timerId = setTimeout(HRK._change, HRK.currentConfigs.delay, HRK._getChangedRange(evt));
  },

  //全てのEditorを監視対象から外す
  _disposeEditorSubscriptions(){
    Object.keys(HRK.editorSubscriptions).forEach( (v, i, a) => {
      HRK.editorSubscriptions[v].dispose();
    });
    HRK.editorSubscriptions = {};
  },

  //閉じられたEditorを監視対象から外す
  _updateEditors(){
    HRK.editors = doOnlySecond(atom.workspace.getTextEditors(), HRK.editors, HRK._disposeEditor)
  },

  //1つのEditorを監視対象から外す
  _disposeEditor(editor) {
    HRK.editorSubscriptions[editor.id].dispose();
    delete HRK.editorSubscriptions[editor.id];
  },

  _getTextEditors(_editor) {
    //console.log('_getTextEditors')
    return (function _getTextEditorsInner(editor) {
      if(!editor) {
        return;
      }
      editor.onDidDestroy(HRK._updateEditors);
      HRK.editors.push(editor);
      if(HRK.currentConfigs.disableUpdate === false) {
        HRK.editorSubscriptions[editor.id] = editor.getBuffer().onDidChange(HRK._setTimer);
      }
      if(HRK.toggled === false) {
        return;
      }
      HRK._unmarkEditor(editor, editor.getBuffer().getRange(), null);
      HRK._markEditor(editor, editor.getBuffer().getRange(), null);
    })(_editor);
  },

  _getDelay(evt){
    return (function _getDelayInner(_evt) {
      HRK.configCson.delay = _evt.newValue;
    })(evt);
  },

  _getDisableUpdate(evt){
    return (function _getDisableUpdate(_evt) {
      HRK.configCson.disableUpdate = _evt.newValue;
      HRK._setConfigs();
    })(evt);
  },

  _getPatterns(evt){
    return (function _getPatternsInner(_evt) {
      HRK.configCson.patterns = HRK.patternsToRegex(_evt.newValue);
      HRK._setConfigs();
    })(evt);
  },

  _getConfigFilePath(evt) {
    return (function _getCFPInner(_evt) {
      HRK.currentConfigs.configFilePath = _evt.newValue;
      let promise = RFC.readFromConfigFile(HRK.currentConfigs.configFilePath);
      promise.then(HRK._setImportedConfigs, HRK._setImportedConfigsInvalid);
    })(evt);
  },

  _getDisableConfigFilePath(evt){
    return (function _getDisableConfigFilePathInner(_evt) {
      HRK.currentConfigs.disableConfigFilePath = _evt.newValue;
      HRK._setConfigs();
    })(evt);
  },

  _setConfigs() {
    //console.log("_setConfigs");
    let newPattrens = [];

    newPattrens = HRK.currentConfigs.configFilePathIsValid && !HRK.currentConfigs.disableConfigFilePath && HRK.importedConfigs.patterns
      ? HRK.importedConfigs.patterns : HRK.configCson.patterns;
    HRK.currentConfigs.delay = HRK.currentConfigs.configFilePathIsValid && !HRK.currentConfigs.disableConfigFilePath && HRK.importedConfigs.delay
      ? HRK.importedConfigs.delay : HRK.configCson.delay;
    HRK.currentConfigs.disableUpdate = HRK.currentConfigs.configFilePathIsValid && !HRK.currentConfigs.disableConfigFilePath && HRK.importedConfigs.disableUpdate
      ? HRK.importedConfigs.disableUpdate : HRK.configCson.disableUpdate;
    HRK._remark(newPattrens);
    HRK._checkDisableUpdate();
    HRK.currentConfigs.patterns = newPattrens;

  },

  _remark(patterns) {
    if(HRK.toggled === true) {
      doOnlySecond(patterns, HRK.currentConfigs.patterns, HRK._unmarkAllEditors);
      doOnlySecond(HRK.currentConfigs.patterns, patterns, HRK._markAllEditors);
    }
  },

  _checkDisableUpdate() {
    if(HRK.currentConfigs.disableUpdate === true) {
      HRK._disposeEditorSubscriptions();
      if( HRK.timerId !== null) {
        clearTimeout(HRK.timerId);
      }
    } else if(Object.keys(HRK.editorSubscriptions).length === 0) {
      //console.log("restoreDisableUpdate");
      for (let editor of atom.workspace.getTextEditors()) {
        HRK.editorSubscriptions[editor.id] = editor.getBuffer().onDidChange(HRK._setTimer);
      }
    }
  },

  _setImportedConfigs(configs) {
    //console.log("_setImportedConfigs");
    HRK.importedConfigs = configs;
    HRK.currentConfigs.configFilePathIsValid = true;
    HRK._setConfigs();

    HRK._fileDispose();
    HRK.configfile = new AFile(HRK.currentConfigs.configFilePath);
    HRK.fileSubscription = HRK.configfile.onDidChange(HRK._readConfig);
  },

  _setImportedConfigsInvalid(err) {
    //console.log(err);
    HRK.currentConfigs.configFilePathIsValid = false;
    HRK._setConfigs();
    HRK._fileDispose();
  },

  _readConfig() {
    let promise = RFC.readFromConfigFile(HRK.currentConfigs.configFilePath);

    promise.then(HRK._setImportedConfigs, HRK._setImportedConfigsInvalid);
  },

  _fileDispose() {
    //console.log("fileDispose");
    if(HRK.fileSubscription) {
      HRK.fileSubscription.dispose();
      HRK.configfile = null;
      HRK.fileSubscription = null;
    }
  }

};
