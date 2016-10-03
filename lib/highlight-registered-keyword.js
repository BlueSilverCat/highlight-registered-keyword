'use babel';

import { CompositeDisposable } from 'atom';

var kPackage = null; //atom.packages.getLoadedPackage('highlight-registered-keyword')

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
    kPackage = this;
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

    kPackage.classes = [];
    for(let i = 0; i < kPackage.patterns.length; ++i){
      result = kPackage.stringToRegex(kPackage.patterns[i].pattern);
      if(result){
        cla = kPackage._className(kPackage.patterns[i].class)
        array.push({'class': cla, 'pattern': result});
        if(kPackage.classes.indexOf(cla) === -1){
          kPackage.classes.push(cla);
        }
      }
    }
    kPackage.patterns = array;
  },

  _mark(editor, pattern, range) {
    //console.log('_mark');
    editor.scanInBufferRange(pattern.pattern, range,
      (result) => {
        var marker = editor.markBufferRange(result.range, {invalidate: kPackage.invalidate, class: pattern.class});

        editor.decorateMarker(marker, {type: 'highlight', class: pattern.class});
      }
    );
  },
  _markEditor(editor, range){
    for(let i = 0; i < kPackage.patterns.length; ++i) { //for...of
      kPackage._mark(editor, kPackage.patterns[i], range);
    }
  },
  _markAllEditors(){
    for(let i = 0; i < kPackage.editors.length; ++i) { //for...of
      kPackage._markEditor(kPackage.editors[i], kPackage.editors[i].getBuffer().getRange())
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
    for(let i = 0; i< kPackage.classes.length; ++i) {
      kPackage._unmark(editor, kPackage.classes[i], range);
    }
  },

  _unmarkAllEditors(){
    for(let i = 0; i < kPackage.editors.length; ++i) {
      kPackage._unmarkEditor(kPackage.editors[i], kPackage.editors[i].getBuffer().getRange());
    }
  },

  _className(str) {
    return kPackage.name + ' ' + str;
  },

  //
  _getChangedRange(evt){
    let minR = 0, maxR = 0;//, minC = 0, maxC = 0;

    minR = Math.min(evt.oldRange.start.row, evt.oldRange.end.row,
      evt.newRange.start.row, evt.newRange.end.row, kPackage.changedRange[0][0]);
    maxR = Math.max(evt.oldRange.start.row, evt.oldRange.end.row,
      evt.newRange.start.row, evt.newRange.end.row, kPackage.changedRange[1][0]);
    //minC = Math.min(evt.oldRange.start.column, evt.oldRange.end.column,
    //  evt.newRange.start.column, evt.newRange.end.column, kPackage.changedRange[0][1]);
    //maxC = Math.max(evt.oldRange.start.column, evt.oldRange.end.column,
    //  evt.newRange.start.column, evt.newRange.end.column, kPackage.changedRange[1][1]);
    //kPackage.changedRange = [[minR, 0], [maxR, maxC]];
    //get maxcolumn?.
    kPackage.changedRange = [[minR, 0], [maxR + 1, 0]];
    return kPackage.changedRange;
  },

  _change(range) {
    let editor = null;

    //console.log('_change');
    if(kPackage.toggled === false || kPackage.disableUpdate === true){
      return;
    }
    editor = atom.workspace.getActiveTextEditor();
    if(!editor){
      return;
    }
    kPackage._unmarkEditor(editor, range);
    kPackage._markEditor(editor, range);
    kPackage.changedRange = [[Number.MAX_VALUE, 0], [0, 0]];
    kPackage.timerId = null;
  },

  _setTimer(evt) {
    //console.log('_setTimer')
    if( kPackage.timerId !== null) {
      clearTimeout(kPackage.timerId);
    }
    if( kPackage.toggled === false || kPackage.disableUpdate === true){
      return;
    }
    kPackage.timerId = setTimeout(kPackage._change, kPackage.delay, kPackage._getChangedRange(evt));
  },

  _disposeEditorSubscriptions(){
    Object.keys(kPackage.editorSubscriptions).forEach( (v, i, a) => {
      kPackage.editorSubscriptions[v].dispose();
    });
    kPackage.editorSubscriptions = {};
  },

  _updateEditors(){
    let editors = [], newEditors = [];

    //console.log('updateEditors');
    editors = atom.workspace.getTextEditors()
    for (let editor of kPackage.editors) {
      if(editors.indexOf(editor) !== -1) {
        newEditors.push(editor);
      } else {
        kPackage.editorSubscriptions[editor.id].dispose();
        delete kPackage.editorSubscriptions[editor.id];
      }
    }
    kPackage.editors = newEditors;
  },

  _getTextEditors(_editor) {
    //console.log('_getTextEditors')
    return (function _getTextEditorsInner(editor) {
      if(!editor) {
        return;
      }
      editor.onDidDestroy(kPackage._updateEditors);
      kPackage.editors.push(editor);

      if(kPackage.disableUpdate === false) {
        kPackage.editorSubscriptions[editor.id] = editor.getBuffer().onDidChange(kPackage._setTimer);
      }

      if(kPackage.toggled === false) {
        return;
      }
      kPackage._unmarkEditor(editor, editor.getBuffer().getRange());
      kPackage._markEditor(editor, editor.getBuffer().getRange());
    })(_editor);
  },

  _getDelay(evt){
    return (function _getDelayInner(_evt) {
      kPackage.delay = _evt.newValue;
    })(evt);
  },

  _getDisableUpdate(evt){
    return (function _getDisableUpdate(_evt) {
      kPackage.disableUpdate = _evt.newValue;
      if(kPackage.disableUpdate === true) {
        kPackage._disposeEditorSubscriptions();
        if( kPackage.timerId !== null) {
          clearTimeout(kPackage.timerId);
        }
      } else {
        for (let editor of atom.workspace.getTextEditors()) {
          kPackage.editorSubscriptions[editor.id] = editor.getBuffer().onDidChange(kPackage._setTimer);
        }
      }
    })(evt);
  },

  _getPatterns(evt){
    return (function _getPatternsInner(_evt) {
      if(kPackage.toggled === true){
        kPackage._unmarkAllEditors();
        kPackage.patterns = _evt.newValue;
        kPackage.patternsToRegex();
        kPackage._markAllEditors();
      } else {
        kPackage.patterns = _evt.newValue;
        kPackage.patternsToRegex();
      }
    })(evt);
  }
};
