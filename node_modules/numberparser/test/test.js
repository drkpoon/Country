var assert = require('assert');
var blanket = require('blanket');
var NumberParser = require('../src/numberparser');
var globalParser = new NumberParser();

function testSuccessCall(expected, value, format) {
    assert.strictEqual(expected, globalParser.parseValue(value, format));
}

function testErrorCall(value, format) {
    assert.throws(function() {
        globalParser.parseValue(value, format);
    }, Error);
}

describe('NumberParser.parseValue(value, format, options)', function() {
    it('should format decimal values', function() {
        testSuccessCall('123', 123, "%d");
        testSuccessCall('123', 123, "%00d");
        testSuccessCall('123000', 123, "%+06d");
        testSuccessCall('000123', 123, "%-06d");
        testSuccessCall('999999123', 123, "%-99d");
    });

    it('should format floating values', function() {
        testSuccessCall('123.45', 123.45, "%f");
        testSuccessCall('123.45', 123.45, "%00f");
        testSuccessCall('123.46', 123.4567, "%.2f");
        testSuccessCall('123.5',  123.45, "%10.1f");
        testSuccessCall('123.45000000', 123.45, "%.8f");
        testSuccessCall('123000.4500', 123.45, "%+06.4f");
        testSuccessCall('000123.4500', 123.45, "%-06.4f");
    });

    it('should format value with symbols', function() {
        testSuccessCall('123%', 123, "%d%");
        testSuccessCall('12300%', 123, "%+05d%");
        testSuccessCall('00123%', 123, "%-05d%");
        testSuccessCall('$123.456', 123.456, "$%.3f");
        testSuccessCall('45.75%', 45.75, "%.2f%");
    });

    it('should format integers with separators', function() {
        testSuccessCall('100', 100, "%sd");
        testSuccessCall('1,000', 1000, "%sd");
        testSuccessCall('10,000', 10000, "%sd");
        testSuccessCall('100,000', 100000, "%sd");
        testSuccessCall('1,000,000', 1000000, "%sd");
        testSuccessCall('1,000,000,000', 1000000000, "%sd");
        testSuccessCall('1,000,000,000,000', 1000000000000, "%sd");
    });

    it('should format floats with separators', function() {
        testSuccessCall('100.55', 100.55, "%sf");
        testSuccessCall('1,000.55', 1000.55, "%sf");
        testSuccessCall('10,000.55', 10000.55, "%sf");
        testSuccessCall('100,000.55', 100000.55, "%sf");
        testSuccessCall('1,000,000.55', 1000000.55, "%sf");
        testSuccessCall('1,000,000,000.55', 1000000000.55, "%sf");
        testSuccessCall('1,000,000,000,000.55', 1000000000000.55, "%16sf");
    });

    it('should not add separators to the remainder', function() {
        testSuccessCall('1,000,000.555500', 1000000.5555, "%.6sf");
        testSuccessCall('10,000.555555', 10000.555555, "%.6sf");
        testSuccessCall('1,000.555555555', 1000.555555555, "%20.9sf");
    });

    it('should allow of overriding of default symbol formatting', function() {
        var customParser = new NumberParser({ separator: '.', decimalPoint: ',' });
        assert.equal('€10.500,25', customParser.parseValue(10500.25, "€%sf"));
    });

    it('should throw an error if the format cannot be parsed', function() {
        testErrorCall(123, "%x");
        testErrorCall(123, "%2.2.2f");
        testErrorCall(123, "%e");
        testErrorCall(123, "%zxy");
        testErrorCall(123, "%abcd");
        testErrorCall(123, "%abcf");
    });

    it('should throw an error if the value is not a number', function() {
        var formats = ["%d", "%f"];
        for (var i in formats) {
            testErrorCall(null, formats[i]);
            testErrorCall('fail', formats[i]);
            testErrorCall('123abc', formats[i]);
            testErrorCall('abc123', formats[i]);
        }
    });
});
