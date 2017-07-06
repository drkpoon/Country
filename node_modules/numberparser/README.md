[![Build Status](https://travis-ci.org/mcross1882/NumberParser.svg?branch=master)](https://travis-ci.org/mcross1882/NumberParser)
[![Coverage Status](http://coveralls.io/repos/mcross1882/NumberParser/badge.svg?branch=master&service=github)](http://coveralls.io/github/mcross1882/NumberParser?branch=master)

# NumberParser
A simple number formatting utility for `Javascript` and `Node.js`

#### Installation

Installation via NPM

```
$ npm install numberparser
```

Installation via Bower

```
$ bower install numberparser
```

#### Including the library

If you are using `Node.js` you can do the following..

```js
var NumberParser = require('numberparser');
```

If you are using the browser you can include the `Javascript` file and
`NumberParser` will be exported to the `window` object.

```html
<script src="/bower_components/numberparser/src/numberparser.min.js" type="text/javascript"></script>
```

#### Using the library

##### Format

```
% [+-] [width] [[.] [precision]] [s] [df]
```

- `+-` If set `+` indicates to pad the number on the right. If set to `-` the number will be
padding on the left. Defaults to `+`
- `width` The width of  the number. If a width is specified the number will be scaled
to match the input width (applying padding if required). When padding is applied the first digit of
`width` is used to determine the padding character and the following digits represent the width. Defaults to `12`
- `precision` if a decimal point is given in the value and a `precision` is specified then the
remainder on the number will be rounded or padded to the proper precision. Defaults to `2`
- `s` This flag indicates whether or not you want separators to appear in the formatted value
- `d|f` The output type, use `d` for integer values and `f` for floating point values


##### Examples

```js
var parser = new NumberParser();

// Format decimal numbers
assert.equal('123',        parser.parseValue(123, "%d"));
assert.equal('0045',       parser.parseValue(45, "%-04d"));

// Format floating point numbers
assert.equal('123.46',     parser.parseValue(123.4567, "%.2f"));
assert.equal('45.000',     parser.parseValue(45, "%.3f"));

// Format a currency value (symbols can be freely appended or prepended to the format)
assert.equal('$123.46',    parser.parseValue(123.456, "$%.2f"));

// Format a percentage value
assert.equal('45.20%',     parser.parseValue(45.2, "%.2f%"));

// Add thousands separators using the "s" flag
assert.equal('10,000',     parser.parseValue(10000, "%sd"));
assert.equal('2,345.67',   parser.parseValue(2345.67, "%sf"));

// You can also customize the formatting by passing in an options object
var customParser = new NumberParser({ separator: '.', decimalPoint: ',' });
assert.equal('€10.500,25', customParser.parseValue(10500.25, "€%sf"));
```

#### Compiling the source code

If you want to recompile the source files you will need to use the Google Closure Compiler.
After you have it installed execute the following commands below.

```
$ export CLOSURE_COMPILER_PATH=/path/to/closure-compiler.jar

$ java -jar $CLOSURE_COMPILER_PATH \
    --create_source_map=numberparser.map \
    --compilation_level=ADVANCED \
    --warning_level=DEFAULT \
    --js_output_file=numberparser.min.js \
    numberparser.js
```
