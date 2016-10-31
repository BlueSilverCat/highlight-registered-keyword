'use babel';

import HRKV from './highlight-registered-keyword-view';
import RFC, { Configs, EditorState } from './read-from-configcson';
import { getOnlySecond } from './utility';
import { CompositeDisposable, File as AtomFile } from 'atom';

export default {
  config: {
    patternsFilePath: {
      type: 'string',
      description: 'Specify the CSON file that describing patterns.',
      'default': ''
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
      description: 'If set this, updating of highlight will be disabled',
      'default': false
    },
    autoMark: {
      type: 'boolean',
      description: 'If set this, highlights all editors automatically',
      'default': false
    }
  },

  initalize() {
    this.name = 'highlight-registered-keyword';
    this.kInitRange = [[Infinity, 0], [0, 0]];
    this.kInvalidate = 'never'; // never or inside

    this.subscriptions = null;
    this.editorStates = [];
    this.timerId = null;  //Timer ID
    this.changedRange = this.kInitRange;  //shallow copy

    this.configs = new Configs();

    this.patternsFile = null;  //監視対象のファイル
    this.fileSubscription = null; //監視対象のファイルのsubscription
  },

  activate() {
    this.initalize();

    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'highlight-registered-keyword:markAll': () => this.markAll(),
      'highlight-registered-keyword:unmarkAll': () => this.unmarkAll(),
      'highlight-registered-keyword:mark': () => this.markActive(),
      'highlight-registered-keyword:unmark': () => this.unmarkActive(),
      'highlight-registered-keyword:show': () => this.show(),
      'highlight-registered-keyword:open': () => this.open(),
      'highlight-registered-keyword:settings': () => this.settings()
    }));

    atom.workspace.addOpener(
      (uri) => {
        if(uri === this.name + '://ValidConfigs') {
          let view = new HRKV();

          view.makeElement(this.configs);
          return view;
        }
        return null;
      }
    );

    this.getConfigs();
    RFC.readFromConfigFile(this.configs.patternsFilePath, this.name, this.setPatterns(), this.setFileInvalid());
  },

  getConfigs() {
    this.configs.patternsFilePath = atom.config.get(this.name + '.patternsFilePath');
    this.configs.delay = atom.config.get(this.name + '.delay');
    this.configs.disableUpdate = atom.config.get(this.name + '.disableUpdate');
    this.configs.autoMark = atom.config.get(this.name + '.autoMark');

    this.subscriptions.add(atom.workspace.observeTextEditors(this.getTextEditors()));
    this.subscriptions.add(atom.config.onDidChange(this.name + '.patternsFilePath', this.getPatternsFilePath()));
    this.subscriptions.add(atom.config.onDidChange(this.name + '.delay', this.getChangedConfig('delay')));
    this.subscriptions.add(atom.config.onDidChange(this.name + '.autoMark', this.getChangedConfig('autoMark')));
    this.subscriptions.add(atom.config.onDidChange(this.name + '.disableUpdate', this.getDisableUpdate()));
  },

  deactivate() {
    this.subscriptions.dispose();
    this.disposeAllEditorSubscriptions();
    this.unmarkAllEditors(null, true);
    if( this.timerId !== null) {
      clearTimeout(this.timerId);
    }
  },

  /*
  //commands
  */
  markAll() {
    this.unmarkAllEditors(null, false);
    this.markAllEditors(null);
  },
  unmarkAll() {
    this.unmarkAllEditors(null, true);
  },
  markActive() {
    let editorState = this.getActiveEditorState();

    if(editorState === null) {
      return;
    }
    this.unmarkEditor(editorState, editorState.editor.getBuffer().getRange(), null, false);
    this.markEditor(editorState, editorState.editor.getBuffer().getRange(), null);
  },
  unmarkActive() {
    let editorState = this.getActiveEditorState();

    if(editorState === null) {
      return;
    }
    this.unmarkEditor(editorState, editorState.editor.getBuffer().getRange(), null, true);
  },

  show() {
    atom.workspace.open(this.name + '://ValidConfigs');
  },

  open () {
    atom.workspace.open(this.configs.patternsFilePath);
  },
  /*
  read() {
    RFC.readFromConfigFile(this.configs.patternsFilePath, this.name, this.setPatterns(), this.setFileInvalid());
  },
  //*/
  settings() {
    atom.workspace.open('atom://config/packages/' + this.name);
  },

  getActiveEditorState() {
    let editor = atom.workspace.getActiveTextEditor();

    if(editor === '') {
      return null;
    }
    for(let editorState of this.editorStates) {
      if(editorState.editor.id === editor.id) {
        return editorState;
      }
    }
    return null;
  },

  /*
  mark / unmark
  */
  mark(editor, pattern, range) {
    if(pattern.disable) {
      return;
    }
    editor.scanInBufferRange(pattern.pattern, range,
      (result) => {
        let marker = editor.markBufferRange(result.range, {invalidate: this.kInvalidate, class: pattern.class});

        editor.decorateMarker(marker, {type: 'highlight', class: pattern.class});
      }
    );
  },

  markEditor(editorState, range, patterns) {
    if(editorState.marked === true) {
      return;
    }
    let target = [];

    if(patterns !== null) {
      target = patterns;
    } else {
      target = this.configs.patterns;
    }

    for(let pattern of target) {
      this.mark(editorState.editor, pattern, range);
    }
    editorState.marked = true;
    this.setEditorDidChange(editorState);
  },

  markAllEditors(patterns) {
    for(let i = 0; i < this.editorStates.length; ++i) { //for...of
      this.markEditor(this.editorStates[i], this.editorStates[i].editor.getBuffer().getRange(), patterns)
    }
  },

  unmark(editor, pattern, range) {
    if(pattern.disable) {
      return;
    }
    let markers = [];

    markers = editor.findMarkers({containedInBufferRange: range, class: pattern.class})
    for(let i = 0; i < markers.length; ++i ){
      markers[i].destroy()
    }
  },

  unmarkEditor(editorState, range, patterns, doDispose) {
    if(editorState.marked === false) {
      return;
    }
    let target = [];

    if(patterns !== null) {
      target = patterns;
    } else {
      target = this.configs.patterns;
    }

    for(let pattern of target) {
      this.unmark(editorState.editor, pattern, range);
    }
    editorState.marked = false;
    if(doDispose === true) {
      this.disposeEditorSubscription(editorState);
    }
  },

  unmarkAllEditors(patterns, doDispose) {
    for(let i = 0; i < this.editorStates.length; ++i) {
      this.unmarkEditor(this.editorStates[i], this.editorStates[i].editor.getBuffer().getRange(), patterns, doDispose);
    }
  },

  //既にmarkedのEditorのみRemarkする
  remarkAllEditors(patterns) {
    for(let i = 0; i < this.editorStates.length; ++i){
      if(this.editorStates[i].marked) {
        let range = this.editorStates[i].editor.getBuffer().getRange();

        this.unmarkEditor(this.editorStates[i], range, getOnlySecond(patterns, this.configs.patterns), false);
        this.markEditor(this.editorStates[i], range, getOnlySecond(this.configs.patterns, patterns));
      }
    }
  },

  //
  getChangedRange(evt) {
    let minR = 0, maxR = 0;

    minR = Math.min(evt.oldRange.start.row, evt.oldRange.end.row,
      evt.newRange.start.row, evt.newRange.end.row, this.changedRange[0][0]);
    maxR = Math.max(evt.oldRange.start.row, evt.oldRange.end.row,
      evt.newRange.start.row, evt.newRange.end.row, this.changedRange[1][0]);

    this.changedRange = [[minR, 0], [maxR, 0]];
    return this.changedRange;
  },

  //+1は問題ないが、-1は0以下にしてはいけない
  getMarkRange(range, lastRow) {
    let markRange = [[0, 0], [0, 0]];
    markRange[0][0] = range[0][0] - 1 < 0 ? 0 : range[0][0] - 1;
    markRange[1][0] = range[1][0] + 1 > lastRow + 1 ? lastRow + 1: range[1][0] + 1;
    return markRange;
  },

  change(editorState) {
    return (range) => {
      if(this.configs.disableUpdate === true){
        return;
      }
      let markRange = this.getMarkRange(range, editorState.editor.getBuffer().getLastRow());
      this.unmarkEditor(editorState, markRange, null, false);
      this.markEditor(editorState, markRange, null);
      this.changedRange = this.kInitRange;  //shallow copy
      this.timerId = null;
    };
  },

  setTimer(editorState) {
    return (evt) => {
      if( this.timerId !== null) {
        clearTimeout(this.timerId);
        if(this.configs.disableUpdate === true){
          return;
        }
      }
      this.timerId = setTimeout(this.change(editorState), this.configs.delay, this.getChangedRange(evt));
    }
  },

  //
  setEditorDidChange(editorState) {
    if(editorState.marked === true && editorState.subscription === null) {
      editorState.subscription = editorState.editor.getBuffer().onDidChange(this.setTimer(editorState));
    }
  },

  //全てのEditorを監視対象から外す
  disposeAllEditorSubscriptions() {
    for(let editorState of this.editorStates) {
      this.disposeEditorSubscription(editorState);
    }
  },
  //1つのEditorを監視対象から外す
  disposeEditorSubscription(editorState) {
    if(editorState.subscription === null) {
      return;
    }
    editorState.subscription.dispose();
    editorState.subscription = null;
  },

  onEditorDidDestroy(editorState) {
    return () => {
      this.disposeEditorSubscription(editorState);
      this.editorStates.splice(this.editorStates.indexOf(editorState), 1);
    }
  },

  getTextEditors() {
    return (editor) => {
      if(!editor) {
        return;
      }
      let editorState = new EditorState(editor);

      editor.onDidDestroy(this.onEditorDidDestroy(editorState));
      this.editorStates.push(editorState);
      if(this.configs.autoMark) {
        this.unmarkEditor(editorState, editor.getBuffer().getRange(), null);
        this.markEditor(editorState, editor.getBuffer().getRange(), null);
      }
    };
  },

  /*
  config
  */

  getChangedConfig(property){
    return (evt) => {
      this.configs[property] = evt.newValue;
    };
  },

  getPatternsFilePath() {
    return (evt) => {
      this.configs.patternsFilePath = evt.newValue;
      RFC.readFromConfigFile(this.configs.patternsFilePath, this.name, this.setPatterns(), this.setFileInvalid());
    }
  },

  getDisableUpdate() {
    return (evt) => {
      this.configs.disableUpdate = evt.newValue;
      this.checkDisableUpdate();
    };
  },

  checkDisableUpdate() {
    if(this.configs.disableUpdate === true) {
      this.disposeAllEditorSubscriptions();
      if( this.timerId !== null) {
        clearTimeout(this.timerId);
      }
      return;
    }
    for(let editorState of this.editorStates) {
      this.setEditorDidChange(editorState);
    }
  },

  setPatterns() {
    return (patterns) => {
      this.remarkAllEditors(patterns);
      this.configs.patterns = patterns;
      this.patternsFile = new AtomFile(this.configs.patternsFilePath);
      this.fileSubscription = this.patternsFile.onDidChange(this.readPatternsFile());
    };
  },

  setFileInvalid() {
    return (err) => {
      if(err[1] === 0) {
        atom.notifications.addError('Cannot read file from patternsFilePath', {detail: err[0], dissmiss: false});
      }
      if(err[1] === 1) {
        atom.notifications.addError('patternsFile is not valid cson file', {detail: err[0], dissmiss: false});
      }
    }
  },

  //ファイルが変更されると2回呼び出されるので、ファイルの中身を調べないといけない
  readPatternsFile() {
    var oldCache = '';

    return () => {
      if(oldCache === this.patternsFile.cachedContent) {
        return;
      }
      oldCache = this.patternsFile.cachedContent;
      RFC.readFromConfigFile(this.configs.patternsFilePath, this.name, this.setPatterns(), this.setFileInvalid());
    };
  },

  fileDispose() {
    if(this.fileSubscription) {
      this.fileSubscription.dispose();
      this.patternsFile = null;
      this.fileSubscription = null;
    }
  }
};
