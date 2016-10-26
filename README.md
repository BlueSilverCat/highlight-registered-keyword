# highlight-registered-keyword package

This package highlights registered keyword, regardless of file extension.  
This package works as temporary grammar.  

This package use the CSON npm package.  

Sorry, Im bad at English.  
For the reason, this is confusing description.  

## How to use
1 Register keyword to your config.cson or CSON file that has been specified in the configFilePath.  
like this.  
```.coffee
  "highlight-registered-keyword":
    delay: 1500
    patterns: [
      {
        class: "keyword"
        pattern: "/WhiteCat|BlackCat/g"
      }
      {
        class: "comment"
        pattern: "/(//.*$)|(#.*$)/g"
      }
      {
        class: "blockcomment"
        pattern: "//\\*[\\S\\s]*?\\*//g"
      }
      {
        class: "keyword"
        pattern: "/\\251|\\xAE/g"
      }
      {
        class: "windowslinebreak"
        pattern: "/\\cM\\cJ/g"
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
atom-text-editor::shadow .highlight {
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
Default key is `Alt+Ctrl+Shift+h`  
If this package does not work, use `highlight-registered-keyword: show` command to check configs.  
![screenshot](https://raw.githubusercontent.com/BlueSilverCat/highlight-registered-keyword/master/sample.png?raw=true)

![short animation](https://raw.githubusercontent.com/BlueSilverCat/highlight-registered-keyword/master/highlight-registered-keyword.gif?raw=true)


## Commands
* `highlight-registered-keyword:toggle`  
  Highlight/Unhighlight keyword.  
  Default key: `Alt+Ctrl+Shift+h`.  
* `highlight-registered-keyword:remark`  
  Remark active editor.  
  Default key: `F5`.
* `highlight-registered-keyword:show`  
  Show current valid configs.  
  Default key: none.  

## about config.cson
Patterns is array of Object.  
Object properties are pattern and class.  
Pattern is a String that is quoted Regular expression.  
Like this `"/.*ABC.*/gmiy"`  
Valid flags are `g`, `m`, `i` and `y`.  
Class is a String that is represent CSS class.  
If you use `\`, it need escape like this `\\`.  
e.g. `\d` is `\\d`.  
If you want to match `\`, you have to write like this `\\\\`
```.js
patterns: [
	{
    # /\\\d+?\\/g; matching string is like this \12345\
		pattern: "/\\\\\\d+?\\\\/g"  
		class: "keyword"
	}
]
```

## about style.less
This package insert div element to near the keyword.  
Div element's class contained `highlight`, `highlight-registered-keyword`, and *`specified-class`*  
```.html
<div class="highlight highlight-registered-keyword comment">
	<div class="region" style="..."></div>
</div>
```
But div element not contained keyword.  
For the above reason, you must to specify region class.
```.css
atom-text-editor::shadow .highlight&.highlight-registered-keyword&.comment .region {
  	background-color: hsla(0, 60%, 50%, 0.5);
}
// or
atom-text-editor::shadow .highlight-registered-keyword&.comment .region {
  	background-color: hsla(0, 60%, 50%, 0.5);
}
```
Valid style: background, border...  
Invalid style: font, color...  

## TODO
* Improve view.

## Known problem
* Lag on particular pattern.  
  e.g. `"/(.*?)/g"`  
* Multi line pattern cannot update highlight status.  
  e.g. `"//\\*[\\S\\s]*?\\*//g"`  
