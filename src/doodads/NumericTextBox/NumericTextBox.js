﻿/* The MIT License

Copyright (c) 2011 Vastardis Capital Services, http://www.vastcap.com/

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
(function ($, undefined) {
    var EPSILON = 1e-10;
    var regexes = Vastardis.UI.Components.ValidationRules.Regexes;

    var NumericTextBox = function () {
        this._backValue = this._frontValue = this._options.value;

        var textDecimals = this._options.textDecimals;
        var valueDecimals = this._options.valueDecimals;

        this._formatText = function (val) {
            return Vastardis.Utility.AddCommaFormat(val, textDecimals);
        };
        this._formatValue = function (val) {
            var raise = Math.pow(10, valueDecimals);
            return Math.round(val * raise) / raise;
        };
    }

    NumericTextBox.defaultOptions = {
        value: null
        , required: false
		, showStar: false
		, enabled: true
		, textDecimals: 2
		, valueDecimals: 4
        , validationListeners: 'hintbox outline'
    }

    NumericTextBox.DefaultRequiredRule = new function () {
        this.validate = function (context) {
            return {
                valid: true
            };
        }
    };

    NumericTextBox.DefaultValidationRule = new function () {
        this.validate = function (context, args) {
            return {
                valid: regexes.Number.test(context)
                , message: 'Please enter a valid number'
            };
        };
    };

    NumericTextBox.prototype = $.extend(new base.constructor(), {
        onComponentReady: function NumericTextBox$onComponentReady() {
            this._input.watermarkingEnabled(false);

            if (this._options.validates) {
                this.addRule(NumericTextBox.DefaultValidationRule);

                if (this._options.required) {
                    this.required(true, NumericTextBox.DefaultRequiredRule);
                }
            }
        }
        , cssClassPrefix: function () {
            return 'numericTextBox'
        }
		, templateData: function NumericTextBox$templateData() {
		    return {
		        showStar: this._options.showStar
				, enabled: this._options.enabled
                , value: $.proxy(function () {
                    return this.formatText()(this.val());
                }, this)
		    };
		}

        /* BEGIN Properties */
        , _underlyingValue: function NumericTextBox$_underlyingValue() {
            if (arguments.length === 0) {
                return this._frontValue;
            } else {
                var newValue = arguments[0];

                if (regexes.Number.test(newValue) && this._frontValue !== null && Math.abs(newValue - this._frontValue) <= EPSILON) {
                    return;
                } else if (!regexes.Number.test(newValue)) {
                    newValue = null;
                }

                this._frontValue = newValue;

                if (arguments[1]) {
                    this.trigger_changing();
                }

                if (this._options.validates) {
                    this.validate();
                }

                if (arguments[1]) {
                    this.trigger_changed();
                }
            }
        }
		, val: function NumericTextBox$val(/*value, triggerEvents*/) {
		    ///	<summary>
		    ///		1: val() - returns the value.
		    ///		2: val(value) - Changes the value.
		    ///		3: val(value, triggerEvents) - Changes value, triggers the change and changing events (if true).
		    ///	</summary>
		    /// <param name="value" type="Int" />
		    /// <param name="triggerEvents" type="Boolean" optional="true">
		    ///		If true, trigger the change and the changing events. 
		    ///	</param>
		    /// <returns type="Int" />

		    if (arguments.length === 0) {
		        if (this._frontValue === null) {
		            return null;
		        } else {
		            return this.formatValue()(this._underlyingValue());
		        }
		    } else {
		        this._underlyingValue.apply(this, arguments);
		        this._updateTextBox();
		        this._backValue = this._frontValue;
		    }
		}
	    , enabled: function NumericTextBox$enabled(/*value*/) {
	        return this._input.enabled.apply(this._input, arguments);
	    }
		, formatText: function NumericTextBox$formatText(/*func*/) {
		    ///	<summary>
		    ///		1: val() - returns the format function.
		    ///		2: val(func) - Changes the format function.
		    ///
		    ///     Format the value of the input when it's not in focus
		    ///
		    ///	</summary>
		    /// <param name="func" type="Function" />
		    /// <returns type="Function" />

		    if (arguments.length === 0) {
		        return this._formatText;
		    } else {
		        this._formatText = arguments[0];
		        this._updateTextBox();
		    }
		}
		, formatValue: function NumericTextBox$formatValue(/*func*/) {
		    ///	<summary>
		    ///		1: val() - returns the format function.
		    ///		2: val(func) - Changes the format function.
		    ///
		    ///     Format the value of the input when it's in focus
		    ///
		    ///	</summary>
		    /// <param name="func" type="Function" />
		    /// <returns type="Function" />

		    if (arguments.length === 0) {
		        return this._formatValue;
		    } else {
		        this._formatValue = arguments[0];
		        this._updateTextBox();
		    }
		}
        /* END Properties */

        /* BEGIN Validation */
		, validationTarget: function NumericTextBox$validationTarget() {
		    return this._input.validationTarget();
		}
		, validationContext: function NumericTextBox$validationContext() {
		    return this.val();
		}
        , isValidationContextEmpty: function NumericTextBox$isValidationContextEmpty(context) {
            return this._input.text().trim() === '';
        }
        , hasInputFocus: function NumericTextBox$hasInputFocus() {
            return this._focused;
        }
        , onInputValid: function NumericTextBox$onInputValid(e) {
            e.stopPropagation();
        }
        , onInputInvalid: function NumericTextBox$onInputInvalid(e) {
            e.stopPropagation();
        }
        /* END Validation */

        /* BEGIN Event Handlers */
		, onFocus: function NumericTextBox$onFocus(e) {
		    this._focused = true;

		    this._updateTextBox();

		    this._input._input.select();

		    this.trigger_focus();
		}
		, onBlur: function NumericTextBox$onBlur(e) {
		    this._focused = false;

		    this._updateTextBox();

		    this.trigger_blur();
		}
		, onChanging: function NumericTextBox$onChanging(e) {
		    this._computeVal();
		}
        /* END Event Handlers */

        , _computeVal: function NumericTextBox$_computeVal() {
            var text = this._input._input.val(),
                value;

            if (regexes.Number.test(text)) {
                this._underlyingValue(parseFloat(Vastardis.Utility.RemoveCommaFormat(text)), true);
            } else {
                this._underlyingValue(null, true);
            }
        }
        , _updateTextBox: function NumericTextBox$_updateTextBox() {
            var text;

            if (this.hasInputFocus()) {
                text = this.val();
            } else if (this.valid() || regexes.Number.test(this._underlyingValue())) {
                text = this.formatText()(this._underlyingValue());
            } else {
                text = this._underlyingValue();
            }

            if (text === null) {
                text = '';
            }

            // Synchronize the underlying TextBox component's private fields
            // with the formatted value stored of this component.
            text += ''; // coerce to string
            this._input._text = text;
            this._input._input.val(text);
        }

        /* BEGIN Event Dispatch */
        , trigger_focus: function NumericTextBox$trigger_focus() {
            $(this).trigger('focus');
        }
        , trigger_blur: function NumericTextBox$trigger_blur() {
            $(this).trigger('blur');
        }
        , trigger_changing: function NumericTextBox$trigger_changing() {
            $(this).trigger('changing');
        }
		, trigger_changed: function NumericTextBox$trigger_changed() {
		    $(this).trigger('changed');
		}
        /* END Event Dispatch */
    });

    window.getComponentType = function () {
        return NumericTextBox;
    }
})(jQuery);