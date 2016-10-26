'use babel';

//import HRK from './highlight-registered-keyword';
import HRKV from './highlight-registered-keyword-view';
import RFC, { Configs, FileConfigs } from './read-from-configcson';
import { doOnlySecond, stringToRegex, setEventListener, disposeEventListeners } from './utility';
import { CompositeDisposable, File as AtomFile } from 'atom';

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
      'default': [{}],
      //'default': [{pattern: '/#.*|//.*/g', 'class': 'comment'}],
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
  keyDownSubscription: null,
  configFile: null,
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
  kMinimumDelay: 0,
  kMaximumDelay: 5000,

  activate() {
    //console.log('activate')
    this.initalize();

    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'highlight-registered-keyword:toggle': () => this.toggle(),
      'highlight-registered-keyword:remark': () => this.remarkEditor(),
      'highlight-registered-keyword:show': () => this.show()
    }));

    this.view = new HRKV();
    /*this.subscriptions.add(atom.views.addViewProvider((model) => {     //正しいのか分からない
      return model.view;
    }));*/
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.view.getElement(),
      //item: this.view,
      visible: false,
      className: this.name
    });

    this.getConfigs();
    this.setConfigs();
    RFC.readFromConfigFile(this.currentConfigs.configFilePath, this.name, this.setImportedConfigs(), this.setImportedConfigsInvalid());
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
    this.keyDownSubscription = null;

    this.fileSubscription = null;
    this.configFile = null;

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

    this.subscriptions.add(atom.workspace.observeTextEditors(this.getTextEditors()));
    this.subscriptions.add(atom.config.onDidChange(this.name + '.configFilePath', this.getConfigFilePath()));
    this.subscriptions.add(atom.config.onDidChange(this.name + '.disableConfigFilePath', this.getDisableConfigFilePath()));
    this.subscriptions.add(atom.config.onDidChange(this.name + '.patterns', this.getChangedConfig('patterns')));
    this.subscriptions.add(atom.config.onDidChange(this.name + '.delay', this.getChangedConfig('delay')));
    this.subscriptions.add(atom.config.onDidChange(this.name + '.disableUpdate', this.getChangedConfig('disableUpdate')));
  },

  deactivate() {
    this.subscriptions.dispose();
    this.disposeEditorSubscriptions();
    if(this.toggled === true) {
      this.unmarkAllEditors(null);
    }
    if( this.timerId !== null) {
      clearTimeout(this.timerId);
    }
    this.modalPanel.destroy();
    this.view.destroy();
    this.fileDispose();
  },

  /*
  //commands
  */
  toggle() {
    //console.log('toggle');
    if(this.toggled === false) {
      this.toggled = true;
      this.markAllEditors(null);
    } else {
      this.toggled = false;
      this.unmarkAllEditors(null);
      if(this.modalPanel.isVisible()){
        this.hidePanel();
      }
    }
  },

  show() {
    //console.log('show');
    if(!this.toggled) {
      return;
    }
    if( this.modalPanel.isVisible() ) {
      this.hidePanel();
      return;
    }
    this.view.makeElement(this.currentConfigs);
    this.modalPanel.show();
    this.keyDownSubscription = setEventListener(document, 'keydown', this.keydownEscape(), true);
  },

  remarkEditor() {
    if(this.toggled === false) {
      return;
    }
    let editor = atom.workspace.getActiveTextEditor();

    if(editor === '') {
      return;
    }

    this.unmarkEditor(editor, editor.getBuffer().getRange(), null);
    this.markEditor(editor, editor.getBuffer().getRange(), null);
  },

  //
  patternsToRegex(patterns) {
    let result = null, cla = '', tmp = [];

    for(let pattern of patterns ) {
      result = stringToRegex(pattern.pattern);
      if(result) {
        cla = this.getClassName(pattern.class)
        tmp.push({'class': cla, 'pattern': result});
      }
    }
    return tmp;
  },

  mark(editor, pattern, range) {
    //console.log('mark');
    editor.scanInBufferRange(pattern.pattern, range,
      (result) => {
        let marker = editor.markBufferRange(result.range, {invalidate: this.kInvalidate, class: pattern.class});

        editor.decorateMarker(marker, {type: 'highlight', class: pattern.class});
      }
    );
  },
  markEditor(editor, range, pattern) {
    if(pattern !== null) {
      this.mark(editor, pattern, range);
    } else {
      for(let i = 0; i < this.currentConfigs.patterns.length; ++i) { //for...of
        this.mark(editor, this.currentConfigs.patterns[i], range);
      }
    }
  },
  markAllEditors(pattern) {
    for(let i = 0; i < this.editors.length; ++i) { //for...of
      this.markEditor(this.editors[i], this.editors[i].getBuffer().getRange(), pattern)
    }
  },

  unmark(editor, pattern, range) {
    let markers = [];

    //console.log('removeMark')
    markers = editor.findMarkers({containedInBufferRange: range, class: pattern.class})
    for(let i = 0; i < markers.length; ++i ){
      markers[i].destroy()
    }
  },

  unmarkEditor(editor, range, pattern) {
    if(pattern !== null) {
      this.unmark(editor, pattern, range);
    }
    for(let i = 0; i< this.currentConfigs.patterns.length; ++i) {
      this.unmark(editor, this.currentConfigs.patterns[i], range);
    }
  },

  unmarkAllEditors(pattern) {
    for(let i = 0; i < this.editors.length; ++i) {
      this.unmarkEditor(this.editors[i], this.editors[i].getBuffer().getRange(), pattern);
    }
  },

   //undefinedの場合はエラーとして扱うか? 現状はclassがundefinedとして登録される。
  getClassName(str) {
    return this.name + ' ' + str;
  },

  //行末を検出できればもっとよくなる
  getChangedRange(evt) {
    //console.log('_getChangedRange', this);
    let minR = 0, maxR = 0;//, minC = 0, maxC = 0;

    minR = Math.min(evt.oldRange.start.row, evt.oldRange.end.row,
      evt.newRange.start.row, evt.newRange.end.row, this.changedRange[0][0]);
    maxR = Math.max(evt.oldRange.start.row, evt.oldRange.end.row,
      evt.newRange.start.row, evt.newRange.end.row, this.changedRange[1][0]);
    //minC = Math.min(evt.oldRange.start.column, evt.oldRange.end.column,
    //  evt.newRange.start.column, evt.newRange.end.column, this.changedRange[0][1]);
    //maxC = Math.max(evt.oldRange.start.column, evt.oldRange.end.column,
    //  evt.newRange.start.column, evt.newRange.end.column, this.changedRange[1][1]);
    //this.changedRange = [[minR, 0], [maxR, maxC]];
    //get maxcolumn?.

    //this.changedRange = [[minR, 0], [maxR + 1, 0]];
    this.changedRange = [[minR, 0], [maxR, Infinity]];
    return this.changedRange;
  },

  change() {
    return (range) => {
      //console.log('_change', this);
      if(this.toggled === false || this.currentConfigs.disableUpdate === true){
        return;
      }
      let editor = atom.workspace.getActiveTextEditor();

      if(!editor){
        return;
      }
      this.unmarkEditor(editor, range, null);
      this.markEditor(editor, range, null);
      this.changedRange = [[Number.MAX_VALUE, 0], [0, 0]];
      this.timerId = null;
    };
  },

  setTimer() {
    return (evt) => {
      //console.log('setTimer', this)
      if( this.timerId !== null) {
        clearTimeout(this.timerId);
        if( this.toggled === false || this.currentConfigs.disableUpdate === true){
          return;
        }
      }
      this.timerId = setTimeout(this.change(), this.currentConfigs.delay, this.getChangedRange(evt));
    }
  },

  //全てのEditorを監視対象から外す
  disposeEditorSubscriptions() {
    //console.log('disposeEditorSubscriptions', this);
    Object.keys(this.editorSubscriptions).forEach( (v, i, a) => {
      this.editorSubscriptions[v].dispose();
    });
    this.editorSubscriptions = {};
  },

  //閉じられたEditorを監視対象から外す
  updateEditors() {
    return () => {
      //console.log('updateEditors', this);
      this.editors = doOnlySecond(this, atom.workspace.getTextEditors(), this.editors, this.disposeEditor);
    };
  },

  //1つのEditorを監視対象から外す
  disposeEditor(editor) {
    //console.log('disposeEditor', this);
    if(this.editorSubscriptions.hasOwnProperty(editor.id)) {
      this.editorSubscriptions[editor.id].dispose();
      delete this.editorSubscriptions[editor.id];
    }
  },

  getTextEditors() {
    return (editor) => {
      if(!editor) {
        return;
      }
      editor.onDidDestroy(this.updateEditors());
      this.editors.push(editor);
      if(this.currentConfigs.disableUpdate === false) {
        this.editorSubscriptions[editor.id] = editor.getBuffer().onDidChange(this.setTimer());
      }
      if(this.toggled === false) {
        return;
      }
      this.unmarkEditor(editor, editor.getBuffer().getRange(), null);
      this.markEditor(editor, editor.getBuffer().getRange(), null);
    };
  },

  getChangedConfig(property){
    return (evt) => {
      this.configCson[property] = evt.newValue;
      this.setConfigs();
    };
  },

  getConfigFilePath() {
    return (evt) => {
      this.currentConfigs.configFilePath = evt.newValue;
      RFC.readFromConfigFile(this.currentConfigs.configFilePath, this.name, this.setImportedConfigs(), this.setImportedConfigsInvalid());
    }
  },

  getDisableConfigFilePath() {
    return (evt) => {
      this.currentConfigs.disableConfigFilePath = evt.newValue;
      this.setConfigs();
    };
  },

  setConfigs() {
    //console.log("setConfigs");
    let newPattrens = [];

    newPattrens = this.currentConfigs.configFilePathIsValid && !this.currentConfigs.disableConfigFilePath && this.importedConfigs.patterns
      ? this.importedConfigs.patterns : this.configCson.patterns;
    this.currentConfigs.delay = this.currentConfigs.configFilePathIsValid && !this.currentConfigs.disableConfigFilePath && this.importedConfigs.delay
      ? this.importedConfigs.delay : this.configCson.delay;
    this.currentConfigs.disableUpdate = this.currentConfigs.configFilePathIsValid && !this.currentConfigs.disableConfigFilePath && this.importedConfigs.disableUpdate
      ? this.importedConfigs.disableUpdate : this.configCson.disableUpdate;
    newPattrens = this.patternsToRegex(newPattrens);
    this.remarkAllEditors(newPattrens);
    this.checkDisableUpdate();
    this.currentConfigs.patterns = newPattrens;
  },

  remarkAllEditors(patterns) {
    if(this.toggled === true) {
      doOnlySecond(this, patterns, this.currentConfigs.patterns, this.unmarkAllEditors);
      doOnlySecond(this, this.currentConfigs.patterns, patterns, this.markAllEditors);
    }
  },

  checkDisableUpdate() {
    //console.log(this);
    if(this.currentConfigs.disableUpdate === true) {
      this.disposeEditorSubscriptions();
      if( this.timerId !== null) {
        clearTimeout(this.timerId);
      }
    } else if(Object.keys(this.editorSubscriptions).length === 0) {
      //console.log("restoreDisableUpdate");
      for (let editor of atom.workspace.getTextEditors()) {
        this.editorSubscriptions[editor.id] = editor.getBuffer().onDidChange(this.setTimer());
      }
    }
  },

  setImportedConfigs() {
    return (configs) => {
      this.importedConfigs = configs;
      this.currentConfigs.configFilePathIsValid = true;
      this.setConfigs();
      this.fileDispose();
      this.configFile = new AtomFile(this.currentConfigs.configFilePath);
      this.fileSubscription = this.configFile.onDidChange(this.readConfig());
    };
  },

  //configFilePath が正常に読み込めた後に、編集して読み込めなくなったらそのファイルは監視から外れる
  //こうなるとそのファイルを再び読み込むには、configFilePathを変更するしかない
  //失敗しても、ファイルパスは常に監視している方が便利ではある
  setImportedConfigsInvalid() {
    return (err) => {
      atom.notifications.addWarning('Cannot read file from configFilePath', {detail: err, dissmiss: true});
      this.currentConfigs.configFilePathIsValid = false;
      this.setConfigs();
      this.fileDispose();
    }
  },

  readConfig() {
    return () => {
      RFC.readFromConfigFile(this.currentConfigs.configFilePath, this.name, this.setImportedConfigs(), this.setImportedConfigsInvalid());
    };
  },

  fileDispose() {
    //console.log("fileDispose");
    if(this.fileSubscription) {
      this.fileSubscription.dispose();
      this.configFile = null;
      this.fileSubscription = null;
    }
  },

  keydownEscape() {
    return (evt) => {
      let keystroke = atom.keymaps.keystrokeForKeyboardEvent(evt);

      if(keystroke === 'escape') {
        this.hidePanel();
      }
    };
  },

  hidePanel() {
    this.modalPanel.hide();
    if(this.keyDownSubscription !== null) {
      disposeEventListeners([this.keyDownSubscription]);
      this.keyDownSubscription = null;
    }
  }
};
