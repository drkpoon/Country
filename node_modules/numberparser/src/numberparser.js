/**
 * A simple number formatting utility for Javascript and Node.js
 *
 * @author  Matthew Cross <blacklightgfx@gmail.com>
 * @package NumberParser
 */
(function() {

/**
 * NumberParser exposes the `parseValue` method which can format numbers into strings.
 * The `parseValue` method works similar to sprintf but is optimized for numbers. When
 * creating a `NumberParser` an options object can be passed into the constructor. Currently
 * the supported `option` properties are
 * - decimalPoint defaults to "."
 * - separator defaults to ","
 *
 * @param {Object} options a map containing configuration properties
 */
var NumberParser = function(options) {
    options = options || {};
    var separator = options['separator'] ? options['separator'] : ',';
    var decimalPoint = options['decimalPoint'] ? options['decimalPoint'] : '.';
    var possibleSymbols = separator + decimalPoint;

    this.INTEGER_REGEX        = new RegExp('%([-+])?([0-9])?(\\d+)?([s])?d');
    this.FLOAT_REGEX          = new RegExp('%([-+])?([0-9]+)?[' + decimalPoint + ']?([0-9]+)?([s])?f');
    this.FORMAT_REGEX         = new RegExp('%.*?([s])?([df])');
    this.HAS_THOUSAND_REGEX   = new RegExp('(\\d\\d\\d\\d)[' + possibleSymbols + ']');
    this.THOUSAND_SPLIT_REGEX = new RegExp('([^' + possibleSymbols + '])(\\d\\d\\d)([' + possibleSymbols + '])');
    this.DEFAULT_DIGIT        = '0';
    this.DEFAULT_WIDTH        = 12;
    this.DEFAULT_PRECISION    = 2;
    this.DEFAULT_DIRECTION    = '+';

    this.separator = separator;
    this.decimalPoint = decimalPoint;
}

NumberParser.prototype.parseValue = function(value, format) {
    if (typeof value != 'number' || isNaN(value)) {
        throw new Error("Cannot parse value. Value must be a number");
    }
    

    var parts = this.extractFormatParts(format);
    var result = value;
    switch (parts.formatType) {
        case 'd':
            result = this.formatInteger(value, format);
            break;
        case 'f':
            result = this.formatFloat(value, format);
            break;
        default:
            throw new Error('Unknown format type "' + parts.formatType + '" was given');
    }

    if (result && parts.usingSeparator) {
        result = this.addSeparators(result);
    }

    return result;
}

NumberParser.prototype.extractFormatParts = function(format) {
    var matches = format.match(this.FORMAT_REGEX);
    if (!matches || matches.length < 3 || !matches[2]) {
        throw new Error("Could not parse " + format);
    }

    return {
        usingSeparator: 's' == matches[1],
        formatType: matches[2]
    };
}

NumberParser.prototype.formatInteger = function(value, format) {
    var formatParts = this.extractIntegerFormat(format);
    if (!formatParts) {
        throw new Error("Invalid integer format given " + format);
    } else if (formatParts.padLeft) {
        value = this.addLeftPadding(value, formatParts.digit, formatParts.width);
    } else if (formatParts.padRight) {
        value = this.addRightPadding(value, formatParts.digit, formatParts.width);
    }

    return format.replace(this.INTEGER_REGEX, value);
}

NumberParser.prototype.extractIntegerFormat = function(format) {
    var matches = format.match(this.INTEGER_REGEX);
    if (!matches || matches.length < 4) {
        return null;
    }

    return {
        padLeft:  '-' == matches[1],
        padRight: '+' == matches[1],
        digit:   matches[2] ? matches[2] : this.DEFAULT_DIGIT,
        width:   matches[3] ? Math.abs(matches[3]) : this.DEFAULT_WIDTH
    };
}

NumberParser.prototype.addLeftPadding = function(value, digit, width) {
    var padding = "";
    var index = 0;
    while (index++ < width) {
        padding += digit;
    }
    return (padding + value).slice(-width);
}

NumberParser.prototype.addRightPadding = function(value, digit, width) {
    var padding = value.toString();
    var index = padding.length;
    while (index++ < width) {
        padding += digit;
    }
    return padding;
}

NumberParser.prototype.formatFloat = function(value, format) {
    if (!this.isValidFloatFormat(format)) {
        throw new Error("Invalid float format given. Too many decimal points in format");
    }

    var formatParts = this.extractFloatFormat(format);
    if (!formatParts) {
        throw new Error("Invalid float format given " + format);
    }

    var paddedValue = this.padFloatValues(value, formatParts);
    return format.replace(this.FLOAT_REGEX, paddedValue).replace(/[.]/g, this.decimalPoint);
}

NumberParser.prototype.isValidFloatFormat = function(format) {
    return format.split(this.decimalPoint).length <= 2;
}

NumberParser.prototype.extractFloatFormat = function(format) {
    var matches = format.match(this.FLOAT_REGEX);
    if (!matches || matches.length < 4) {
        return null;
    }

    return {
        paddingDirection: matches[1] ? matches[1] : this.DEFAULT_DIRECTION,
        width: matches[2] ? matches[2].replace(/[-+]/g, '') : this.DEFAULT_WIDTH,
        precision: matches[3] ? matches[3] : this.DEFAULT_PRECISION
    };
}

NumberParser.prototype.padFloatValues = function(value, formatParts) {
    var widthFormat = "%" + formatParts.paddingDirection + formatParts.width + "d";
    var splitValues = value.toString().split('.');
    splitValues[0] = this.formatInteger(splitValues[0], widthFormat);
    if (2 == splitValues.length) {
        var newPrecision = parseFloat("." + splitValues[1]).toFixed(formatParts.precision);
        splitValues[1] = newPrecision.split(".").pop();
    }

    return splitValues.join('.');
}

NumberParser.prototype.addSeparators = function(value) {
    var splitValue = value.toString().split(this.decimalPoint);
    var tempValue = this.injectSeparators(splitValue[0], this.separator, this.decimalPoint);

    if (splitValue.length == 2) {
        tempValue += this.decimalPoint + splitValue[1];
    }

    return tempValue;
}

NumberParser.prototype.injectSeparators = function(value, separator, decimalPoint) {
    var tempValue = value;
    if (tempValue.length < 4) {
        return tempValue;
    }

    tempValue = tempValue.replace(/(\d\d\d)$/g, separator + "$1");
    while (this.HAS_THOUSAND_REGEX.test(tempValue)) {
        tempValue = tempValue.replace(this.THOUSAND_SPLIT_REGEX, "$1" + separator + "$2$3");
    }
    return tempValue;
}

/**
 * Export the parseValue method to protect against minification
 */
NumberParser.prototype['parseValue']   = NumberParser.prototype.parseValue;

if (typeof module != 'undefined' && typeof module['exports'] != 'undefined') {
    module['exports'] = NumberParser;
}

if (typeof module == 'undefined' && typeof window != 'undefined') {
    window['NumberParser'] = NumberParser;
}

})();
