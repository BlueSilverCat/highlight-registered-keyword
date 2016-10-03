# highlight-registered-keyword package

This package highlight registed keyword.  
This package works as temporary grammar.  

Sorry, Im bad at English.  
For the reason, this is confusing description.  

## How to use
1. Register keyword to your config.cson. like this.
```.coffee
  "highlight-registered-keyword":
    delay: 2000
    patterns: [
      {
        pattern: "///.*/g"
        class: "comment"
      }
      {
        pattern: "/#.*/g"
        class: "comment"
      }
      {
        pattern: "//\\*[\\S\\s]*?\\*//g"
        class: "blockcomment"
      }
      {
        pattern: "/RedCat/g"
        class: "redcat"
      }
      {
        pattern: "/GreenCat/g"
        class: "greencat"
      }
      {
        pattern: "/BlueCat/g"
        class: "bluecat"
      }
      {
        pattern: "/\\bcat\\b/gi"
        class: "cat"
      }
      {
        pattern: "/\\\\/g"
        class: "backslash"
      }
    ]
```

2. Resister style to your styles.less. like this.
```.css
atom-text-editor::shadow .highlight {
  &.highlight-registered-keyword {
    .region {
      background-color: hsla(0, 60%, 50%, 0.5);
    }
    &.comment {
      .region {
        background-color: hsla(120, 50%, 25%, 0.5);
        border-style: dotted;
        border-color: hsla(180, 60%, 50%, 0.5);
      }
    }
    &.blockcomment {
      .region {
        background-color: hsla(60, 50%, 25%, 0.5);
      }
    }
    &.backslash {
      .region {
        background-color: hsla(300, 50%, 25%, 0.5);
      }
    }
    &.redcat {
      .region {
        background-color: hsla(0, 60%, 50%, 0.5);
      }
    }
    &.greencat {
       .region {
         background-color: hsla(120, 60%, 50%, 0.5);
       }
    }
    &.bluecat {
       .region {
         background-color: hsla(240, 60%, 50%, 0.5);
       }
    }
    &.cat {
       .region {
         background-color: hsla(180, 60%, 50%, 0.5);
       }
    }
  }
}
```

3. Activate package.
default key is ...

## about config.cson
Patterns is array of Object.  
Object properties are pattern and class.  
pattern is a String that is quoted Regular expression.  
like this `"/.*ABC.*/gmiy"`  
class is a String that is represent CSS class.  
valid flags are `g`, `m`, `i` and `y`.  
if you use `\`, it need escape like this `\\`.  
e.g. `\d` is `\\d`.  
if you want to match `\`, you have to write like this `\\\\`
```.js
patterns: [
	{
    # /\\\d\\/g; matching string is like this /12345/
		pattern: "/\\\\\\d?\\\\/g"  
		class: "keyword"
	}
]
```

## about style.less
this package insert div element to near the keyword.  
div element's class contained `highlight`, `highlight-registered-keyword`, and *`specified-class`*  
```.html
<div class="highlight highlight-registered-keyword comment">
	<div class="region" style="..."></div>
</div>
```
but div element not contained keyword.  
for the above reason, you must to specify region class.
```.css
atom-text-editor::shadow .highlight&.highlight-registered-keyword&.specified-class .region {
  	background-color: hsla(0, 60%, 50%, 0.5);
}
// or
atom-text-editor::shadow .highlight-registered-keyword&.specified-class .region {
  	background-color: hsla(0, 60%, 50%, 0.5);
}
```
valid style: background, border...  
invalid style: font, color...  

![A screenshot of your package](https://f.cloud.github.com/assets/69169/2290250/c35d867a-a017-11e3-86be-cd7c5bf3ff9b.gif)

## Known problem
* lag on particular pattern.  
  e.g. `"/(.*?)/g"`  
* multi line pattern cannot update highlight status.  
  e.g. `"//\\*[\\S\\s]*?\\*//g"`  
