'use babel';

import HRK from './highlight-registered-keyword';
import { CompositeDisposable } from 'atom';

export default {
  config: {
    delay: {
      type: 'integer',
      description: 'delay time for update(ms)',
      'default': 1500,
      minimum: 0,
      maximum: 5000
    },
    disableUpdate: {
      type: 'boolean',
      description: 'If set this, highlighting update  be disabled',
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
  editorSubscriptions: {},
  toggled: false, //flag for toggle
  classes: [],
  editors: [],
  timerId: null,  //Timer ID
  invalidate: 'never', // never or inside
  //patterns: [],
  //delay: 0,
  //disableUpdate: false,
  changedRange: [[Number.MAX_VALUE, 0], [0, 0]],

  kCheckRegex1: /\/(.*)\/(.*)/,   //use this forconvert string to Regex
  kCheckRegex2: /^[gimy]{0,4}$/,  //for check regular expression. whether flags are valid or not
  kCheckRegex3: /(.).*?\1/,       //for check regular expression. whether flags are duplicate or not

  activate(state) {
    //console.log('activate')
    this.initalize();
    //HRK = this;
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'highlight-registered-keyword:toggle': () => this.toggle()
    }));

    this.patterns = atom.config.get(this.name + '.patterns');
    this.patternsToRegex();
    this.delay = atom.config.get(this.name + '.delay');
    this.disableUpdate = atom.config.get(this.name + '.disableUpdate');

    this.subscriptions.add(atom.workspace.observeTextEditors(this._getTextEditors));
    this.subscriptions.add(atom.config.onDidChange(this.name + '.patterns', this._getPatterns));
    this.subscriptions.add(atom.config.onDidChange(this.name + '.delay', this._getDelay));
    this.subscriptions.add(atom.config.onDidChange(this.name + '.disableUpdate', this._getDisableUpdate));
  },

  initalize(){
    this.subscriptions = null;
    this.editorSubscriptions = {};
    this.toggled = false;
    this.classes = [];
    this.editors = [];
    this.timerId = null;
    this.changedRange = [[Number.MAX_VALUE, 0], [0, 0]];
  },

  deactivate() {
    this.subscriptions.dispose();
    this._disposeEditorSubscriptions();
    if(this.toggled === true) {
      this._unmarkAllEditors();
    }
    if( this.timerId !== null) {
      clearTimeout(this.timerId);
    }
  },

  serialize() {
    return;
  },

  toggle() {
    //console.log('toggle');
    if(this.toggled === false) {
      this.toggled = true;
      this._markAllEditors();
    } else {
      this.toggled = false;
      this._unmarkAllEditors();
    }
    return;
  },

  stringToRegex(string) {
    let match = this.kCheckRegex1.exec(string);

    if ( match !== null
       && match[1] !== ''
       && this.kCheckRegex2.test(match[2])  //flag checking
       && !this.kCheckRegex3.test(match[2]) //duplicate?
     ) {
      return new RegExp(match[1], match[2]);
    }
    return null;
  },

  patternsToRegex() {
    let result = null, array = [], cla = '';

    HRK.classes = [];
    for(let i = 0; i < HRK.patterns.length; ++i){
      result = HRK.stringToRegex(HRK.patterns[i].pattern);
      if(result){
        cla = HRK._className(HRK.patterns[i].class)
        array.push({'class': cla, 'pattern': result});
        if(HRK.classes.indexOf(cla) === -1){
          HRK.classes.push(cla);
        }
      }
    }
    HRK.patterns = array;
  },

  _mark(editor, pattern, range) {
    //console.log('_mark');
    editor.scanInBufferRange(pattern.pattern, range,
      (result) => {
        let marker = editor.markBufferRange(result.range, {invalidate: HRK.invalidate, class: pattern.class});

        editor.decorateMarker(marker, {type: 'highlight', class: pattern.class});
      }
    );
  },
  _markEditor(editor, range){
    for(let i = 0; i < HRK.patterns.length; ++i) { //for...of
      HRK._mark(editor, HRK.patterns[i], range);
    }
  },
  _markAllEditors(){
    for(let i = 0; i < HRK.editors.length; ++i) { //for...of
      HRK._markEditor(HRK.editors[i], HRK.editors[i].getBuffer().getRange())
    }
  },

  _unmark(editor, cla, range) {
    let markers = [];

    //console.log('removeMark')
    markers = editor.findMarkers({containedInBufferRange: range, class: cla})
    for(let i = 0; i < markers.length; ++i ){
      markers[i].destroy()
    }
  },

  _unmarkEditor(editor, range){
    for(let i = 0; i< HRK.classes.length; ++i) {
      HRK._unmark(editor, HRK.classes[i], range);
    }
  },

  _unmarkAllEditors(){
    for(let i = 0; i < HRK.editors.length; ++i) {
      HRK._unmarkEditor(HRK.editors[i], HRK.editors[i].getBuffer().getRange());
    }
  },

  _className(str) {
    return HRK.name + ' ' + str;
  },

  //
  _getChangedRange(evt){
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
    if(HRK.toggled === false || HRK.disableUpdate === true){
      return;
    }
    editor = atom.workspace.getActiveTextEditor();
    if(!editor){
      return;
    }
    HRK._unmarkEditor(editor, range);
    HRK._markEditor(editor, range);
    HRK.changedRange = [[Number.MAX_VALUE, 0], [0, 0]];
    HRK.timerId = null;
  },

  _setTimer(evt) {
    //console.log('_setTimer')
    if( HRK.timerId !== null) {
      clearTimeout(HRK.timerId);
    }
    if( HRK.toggled === false || HRK.disableUpdate === true){
      return;
    }
    HRK.timerId = setTimeout(HRK._change, HRK.delay, HRK._getChangedRange(evt));
  },

  _disposeEditorSubscriptions(){
    Object.keys(HRK.editorSubscriptions).forEach( (v, i, a) => {
      HRK.editorSubscriptions[v].dispose();
    });
    HRK.editorSubscriptions = {};
  },

  _updateEditors(){
    let editors = [], newEditors = [];

    //console.log('updateEditors');
    editors = atom.workspace.getTextEditors()
    for (let editor of HRK.editors) {
      if(editors.indexOf(editor) !== -1) {
        newEditors.push(editor);
      } else {
        HRK.editorSubscriptions[editor.id].dispose();
        delete HRK.editorSubscriptions[editor.id];
      }
    }
    HRK.editors = newEditors;
  },

  _getTextEditors(_editor) {
    //console.log('_getTextEditors')
    return (function _getTextEditorsInner(editor) {
      if(!editor) {
        return;
      }
      editor.onDidDestroy(HRK._updateEditors);
      HRK.editors.push(editor);

      if(HRK.disableUpdate === false) {
        HRK.editorSubscriptions[editor.id] = editor.getBuffer().onDidChange(HRK._setTimer);
      }

      if(HRK.toggled === false) {
        return;
      }
      HRK._unmarkEditor(editor, editor.getBuffer().getRange());
      HRK._markEditor(editor, editor.getBuffer().getRange());
    })(_editor);
  },

  _getDelay(evt){
    return (function _getDelayInner(_evt) {
      HRK.delay = _evt.newValue;
    })(evt);
  },

  _getDisableUpdate(evt){
    return (function _getDisableUpdate(_evt) {
      HRK.disableUpdate = _evt.newValue;
      if(HRK.disableUpdate === true) {
        HRK._disposeEditorSubscriptions();
        if( HRK.timerId !== null) {
          clearTimeout(HRK.timerId);
        }
      } else {
        for (let editor of atom.workspace.getTextEditors()) {
          HRK.editorSubscriptions[editor.id] = editor.getBuffer().onDidChange(HRK._setTimer);
        }
      }
    })(evt);
  },

  _getPatterns(evt){
    return (function _getPatternsInner(_evt) {
      if(HRK.toggled === true){
        HRK._unmarkAllEditors();
        HRK.patterns = _evt.newValue;
        HRK.patternsToRegex();
        HRK._markAllEditors();
      } else {
        HRK.patterns = _evt.newValue;
        HRK.patternsToRegex();
      }
    })(evt);
  }
};
