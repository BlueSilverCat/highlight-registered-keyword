# highlight-registered-keyword package

This package highlights registered keyword, regardless of file extension.  
This package works as temporary grammar.  

This package use the CSON npm package.  

Sorry, Im bad at English.  
For the reason, this is confusing description.  

## How to use
1 Set PatternsFilePath. PatternsFilePath specifies CSON file that defines keyword.  
e.g.  
```.coffee
"highlight-registered-keyword": [
  {
    class: "keyword"
    pattern: "/WhiteCat|BlackCat/g"
    fileTypes:["txt"]
  }
  {
    class: "comment"
    pattern: "///.*$/g"
    fileTypes:["c", "cpp", "js"]
  }
  {
    class: "comment"
    pattern: "/#.*$/g"
    fileTypes:["py"]
  }
  {
    class: "blockcomment"
    pattern: "//\\*[\\S\\s]*?\\*//g"
    fileTypes:["c", "cpp", "js"]
  }
  {
    class: "blockcomment"
    pattern: "/'''[\\S\\s]*?'''/g"
    fileTypes:["py"]
  }
  {
    class: "keyword"
    pattern: "/\\251|\\xAE/g"
  }
  {
    class: "windowslinebreak"
    pattern: "/\\cM\\cJ/g"
    disable: true
  }
  {
    class: "badSpace"
    pattern: "/\u00A0|\u2000|\u2001|\u2002|\u2003|\u2004|\u2005|\u2006|\u2007|\u2008|\u2009|\u200A|\u202F|\u205F|\u3000/g"
  }
  {
    class: "badZeroWidthSpace"
    pattern: "/\u200B|\u200C|\u200D|\uFEFF/g"
  }
  {
    class: "escapeSequence"
    pattern: "/\\\\./g"
  }
  {
    class: "literal"
    pattern: "/\".*?\"/g"
  }
  {
    class: "ISBN"
    pattern: "/(ISBN-13 ?((978)|(979))-\\d{1,9}-\\d{1,9}-\\d{1,9}-\\d)|(ISBN-10 ?\\d{1,9}-\\d{1,9}-\\d{1,9}-\\d)/g"
  }
  {
    class: "surrogatePairs"
    pattern: "/\u{2000B}|\u{2123D}|\u{2131B}|\u{2146E}|\u{218BD}|\u{20B9F}|\u{216B4}|\u{21E34}|\u{231C4}|\u{235C4}/g"
  }
]
```

2 Register style to your styles.less. like this.  
```.css
atom-text-editor .highlight {
  &.highlight-registered-keyword {
    .region {
      background-color: hsla(180, 60%, 50%, 0.5);
    }
    &.comment {
      .region {
        background-color: hsla(120, 50%, 25%, 0.5);
      }
    }
    &.blockcomment {
      .region {
        background-color: hsla(60, 50%, 25%, 0.5);
      }
    }
    &.windowslinebreak {
      .region {
        background-color: hsla(40, 50%, 25%, 0.5);
      }
    }
    &.escapeSequence {
      .region {
        background-color: hsla(300, 50%, 25%, 0.5);
      }
    }
    &.keyword {
      .region {
        background-color: hsla(0, 60%, 50%, 0.5);
      }
    }
    &.literal {
      .region {
        background-color: hsla(320, 60%, 50%, 0.5);
      }
    }
    &.badSpace {
      .region {
        background-color: hsla(0, 60%, 50%, 0.5);
        border: solid;
        border-color: hsla(120, 60%, 50%, 0.5);
      }
      .region:after {
        content: '_';
        color: hsla(240, 100%, 50%, 1);
      }
    }
    &.badZeroWidthSpace {
      .region {
        background-color: hsla(0, 100%, 50%, 1);
        border: solid;
        border-color: hsla(0, 100%, 50%, 1);
       }
    }
    &.ISBN {
      .region {
        background-color: hsla(60, 60%, 50%, 0.5);
      }
    }
    &.surrogatePairs {
      .region {
        background-color: hsla(300, 100%, 50%, 1);
        border: solid;
        border-color: hsla(0, 100%, 50%, 1);
      }
    }
  }
}
```

3 Activate package.  
Press `Alt+Ctrl+Shift+h` or `F5`  
If this package does not work, use `highlight-registered-keyword:show` command to check patterns.  
![screenshot](https://raw.githubusercontent.com/BlueSilverCat/highlight-registered-keyword/master/sample.png?raw=true)

![short animation](https://raw.githubusercontent.com/BlueSilverCat/highlight-registered-keyword/master/highlight-registered-keyword.gif?raw=true)


## Commands
* `highlight-registered-keyword:markAll`  
  Highlight keywords in all editors.  
  Default key: `Alt+Ctrl+Shift+h`.  
* `highlight-registered-keyword:unmarkAll`  
  Unhighlight keywords in all editors.  
  Default key: none.  
* `highlight-registered-keyword:mark`  
  Highlight keywords in an only active editor.  
  Default key: `F5`.  
* `highlight-registered-keyword:unmark`  
  Unhighlight keywords in an only active editor.  
  Default key: none.  
* `highlight-registered-keyword:show`  
  Show current valid configs.  
  Default key: none.  
* `highlight-registered-keyword:open`  
  Open PatternsFile that has been specified by PatternsFilePath.  
  Default key: none.  
* `highlight-registered-keyword:settings`  
  Open package settings.  
  Default key: none.  

## About file that has been specified by FilePath.
Patterns is array of Object.  
Object properties are `pattern`, `class`, `fileTypes` and `disable`.  
`pattern` is a String that was quoted regular expression.  
Like this `"/.*ABC.*/gmiy"`.  
Valid flags are `g`, `m`, `i` and `y`.  
`class` is a String that represents CSS class.  
`disable` is Boolean that represents this pattern is disable.  
`disable` is optional. If you don't describe this, it set to false.  
`fileTypes` is Array of String that specify the target filetypes.  
`fileTypes` is optional. If you don't describe this, it set to `["*"]`\(all filetype).  
If you use `\`, it need escaping like this `\\`.  
e.g. `\d` is `\\d`.  
If you want to match `\`, you have to write like this `\\\\`  
```.coffee
"highlight-registered-keyword": [
  {
    # /\\\d+?\\/g; matching string is like this \12345\
    class: "keyword"
    pattern: "/\\\\\\d+?\\\\/g"  
    disable: false
    fileTypes: ["*"]
  }
]
```

## About style.less
This package insert div element to near the keyword.  
Div element's class contained `highlight`, `highlight-registered-keyword`, and *`specified-class`*  
```.html
<div class="highlight highlight-registered-keyword comment">
	<div class="region" style="..."></div>
</div>
```
But div element not containes keyword.  
For the above reason, you must to specify region class.  
```.css
atom-text-editor .highlight&.highlight-registered-keyword&.comment .region {
  	background-color: hsla(0, 60%, 50%, 0.5);
}
// or
atom-text-editor .highlight-registered-keyword&.comment .region {
  	background-color: hsla(0, 60%, 50%, 0.5);
}
```
Valid style: background, border...  
Invalid style: font, color...  

## Known problem
* Lag on particular pattern.  
  e.g. `"/(.*?)/g"`  
* Multi line pattern cannot updates highlight status.  
  e.g. `"//\\*[\\S\\s]*?\\*//g"`  
