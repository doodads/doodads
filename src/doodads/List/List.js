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
    // to make better sense of this class, please be aware that the model for the generic list
    // is basically decorated with extra metadata that maintains information about DOM nodes and indexing.
    // To preserve the user's data and not add any new properties onto it,
    // this decoration is handled through a mapping between user data and list data.
    // The component maintains a bidirectional mapping between the DOM and the users data, so it is
    // possible to get at one if you have the other.
    // From data to DOM: this._itemMap[this.indexOf(data)].domNode
    // From DOM to data: $(domElement).data('metadata')
    // The data -> DOM mapping is intentionally obtuse since it should only be used by a derived control
    // and not exposed to component users. Generally speaking, in the few places you need access to the DOM representation
    // of an item, it is available to you automatically, so the data -> DOM mapping is not really necessary to begin with.

    // EVENTS:
    // This component exposes two events (in addition to any inherited via Component):
    //  * itemRendered
    //   - This event is triggered whenever an item in the model gets rendered to the DOM.
    //     The event has the following object literal associated with it: { item: {}, domNode: HtmlElement }
    //     where item represents the model item and domNode represents the rendered representation of the model item.
    //  * modelChanged
    //   - This event is triggered whenever the underlying model (dataSource) for the component changes
    //     for any reason (either through directly setting dataSource or via the manipulation methods).
    ///    Note that this event is only concerned about changes to the List model, not the individual item model.
    //     so changes to an individual item do not trigger a modelChanged event.
    // In almost all scenarios where the model is manipulated, both modelChanged and itemRendered will get
    // triggered in tandem, but it is possible to get only itemRendered to trigger, so do not rely on this.
    // For example, if you call List.rerender, all the items will rerender (and trigger itemRendered), but no modelChanged
    // event will be triggered.

    // Examples of EVENTS:
    // var list = new vscG.List({});
    // $(list).bind('modelChanged', function(eventArgs) { /* at this point, the underlying model for the component has changed */ });
    // $(list).bind('itemRendered', function(eventArgs, parameters) { /* parameters.item is the model, parameters.domNode is the html element. */ });

    var List = function () {
        ///<summary>
        /// The Generic List serves as a convenient base class for list-oriented Components like Menus.
        /// The class provides methods to manipulate the list model and reflect the changes in the DOM
        /// in an efficient fashion. The presentation of the individual list elements is completely decoupled
        /// from the data through the use of the templates.
        ///</summary>
        this._dataSource = [];
        this._itemMap = [];
        this._containerElement = null;
        this._singleItemTemplate = null;
        this._guid = 0;
    }
    List.prototype = $.extend(new base.constructor(), {
        constructElement: function List$constructElement() {
            ///<summary>
            /// Constructs the Generic list component's DOM fragment.
            /// Look at Vastardis.UI.Components.Component::constructElement for more details.
            ///</summary>
            var transformedData = this._templateData();

            transformedData.items.push({ __empty: true, __guid: ++this._guid });

            this._source = $(this._processTemplates(transformedData));

            $.each(transformedData.items, $.proxy(function (index, item) {
                var domNode = $(String.format('[data-guid=\'{0}\']', item.__guid), this.element());

                this._containerElement = domNode.parent();
                if (item.__empty) {
                    domNode.remove();
                } else {
                    var mapRef = this._itemMap[index];

                    mapRef.domNode = domNode;
                    domNode
                        .removeAttr('data-guid')
                        .data('metadata', mapRef.data);
                }
            }, this));

            base._generateDOMReferences.call(this);
        }
        , _instantiateChildComponents: function List$_instantiateChildComponents() {
            // override the base implementation to trigger itemRendered *after* all 
            // autogenerated nodes are ready.
            base._instantiateChildComponents.apply(this, arguments);

            $.each(this._itemMap, $.proxy(function (i, mapRef) {
                this.trigger_itemRendered(mapRef.data, mapRef.domNode);
            }, this));
        }
        , _wrapSingleItem: function List$_wrapSingleItem(item, index) {
            ///<summary>
            /// Given a particular item at a given index in the model array, decorates the item
            /// with metadata that allows the Generic List to perform quick look ups and DOM manipulation.
            ///</summary>
            ///<param name="item">The JS object literal to decorate</param>
            ///<param name="index" optional="true">
            /// The index of the item in the model array. This parameter is optional and will be
            /// auto-generated if necessary.
            ///</param>
            return { data: item, guid: index ? ('i' + index) : ('g' + (++this._guid)), domNode: null };
        }
        , _createMustacheSchema: function List$_createMustacheSchema(wrappedItem) {
            ///<summary>
            /// Prepares the internally decorated version of a list item for rendering by adding
            /// the necessary Mustache decorations.
            ///</summary>
            return $.extend({}, wrappedItem.data, { __guid: wrappedItem.guid });
        }
        , _renderSingleItem: function List$_renderSingleItem(wrappedItem) {
            ///<summary>
            /// Renders a single member of the model array.
            ///</summary>
            ///<param name="wrappedItem">The internally decorated version of the member of the model array.</param>

            var dataSourceRef, transformedData,
                oldSource, oldChildren,
                newDomNode;

            // To ensure that the derived class' templateData function can be used in all scenarios where
            // the dataSource gets manipulated (either through directly setting dataSource or by manipulating the
            // model with the manipulator methods), this function temporarily repurposes the dataSource property
            // to represent a single item.
            dataSourceRef = this._dataSource;
            this._dataSource = [wrappedItem.data];
            transformedData = this._createMustacheSchema($.extend({}, wrappedItem, { data: this.templateData()[0] }));
            this._dataSource = dataSourceRef;

            if (!this._singleItemTemplate) {
                this._singleItemTemplate = Mustache.compile(this._options.templates['item']);
            }

            // some methods on the base Component class only work on the root DOM element (this._source)
            // but their functionality is useful, so we fake it so that this._source points to the fragment
            // with the single list item.
            // also note that we are using *base._instantiateChildComponents* so that the itemRendered 
            // event wont trigger
            oldSource = this._source;
            this._source = $(this._singleItemTemplate(transformedData));

            // same as above, list needs to keep track of the list of children associated with each row/item
            // so that if the item is removed, the integrity of the children list can be maintained.
            oldChildren = this._children;
            this._children = [];

            base._instantiateChildComponents.call(this);
            base._generateDOMReferences.call(this);

            wrappedItem.componentChildren = this._children;
            this._children = oldChildren;

            newDomNode = this._source;
            this._source = oldSource;

            wrappedItem.domNode = newDomNode;
            newDomNode.data('metadata', wrappedItem.data);

            this.trigger_itemRendered(wrappedItem.data, wrappedItem.domNode);

            return newDomNode;
        }
        , _templateData: function List$_templateData() {
            ///<summary>
            /// Conceptually, this function performs the same task as Component.templateData, but the
            /// trick is that since both the user and the list component need to perform the dataSource->templateData
            /// conversion, the existence of the list component's transformation needs to be hidden from users.
            ///</summary>
            // ask the implementor to transform the data
            var transformed = this.templateData();

            // make sure the bookkeeping information is associated with the correct objects
            return {
                items: $.map(transformed, $.proxy(function (item, index) {
                    return this._createMustacheSchema($.extend({}, this._itemMap[index], { data: item }));
                }, this))
            };
        }
        , _processTemplates: function List$_processTemplates(dataSet) {
            ///<summary>
            /// Renders the dataSet argument as per the template.
            ///</summary>
            ///<remarks>
            /// The difference with the base class implementation is that this
            /// renders an arbitrary templateData, whereas the base is locked into 
            /// this.templateData()
            ///</remarks>
            if (!this._options.templates.__compiledTemplate) {
                try {
                    this._options.templates.__compiledTemplate = Mustache.compile(this._options.templates['base'], this._options.templates);
                } catch (e) {
                    if (e.is_mustache_error) {
                        console.error(e.message);
                    } else {
                        throw e;
                    }
                }
            }
            return this._options.templates.__compiledTemplate(dataSet);
        }
        , _computeValidityState: function List$_computeValidityState() {
            base._computeValidityState.apply(this, arguments);

            var isValid = this._isValid,
                i, n, k, m,
                children;

            if (isValid && this.listenToChildrenValidity()) {
                for (i = 0, n = this._dataSource.length; i < n; ++i) {
                    children = this._itemMap[i].componentChildren || [];
                    for (j = 0, m = children.length; j < m; ++j) {
                        if (!children[j].valid()) {
                            isValid = false;
                            break;
                        };
                    }

                    if (!isValid) {
                        break;
                    }
                }
            }

            this._isValid = isValid;
        }
        , dataSource: function List$dataSource(/*newValue*/) {
            ///<summary>
            /// Getter/Setter.
            /// The dataSource parameter (which is inherited from Component base class) represents the underlying
            /// model for the generic list component. Any change to the dataSource (either directly or through
            /// the manipulation methods) will result in the view (DOM) to be updated to reflec the changes.
            ///
            /// When called with no arguments, retrieves the current model.
            /// When called with one arguments, sets the current model to the passed in value. Note that
            /// the argument must be an array type. Although this is not enforced in code, various exceptions will
            /// be thrown if this is not the case.
            ///</summary>
            if (arguments.length === 0) {
                return this._dataSource;
            } else {
                this._clear();

                this._dataSource = arguments[0] || [];

                // we actually want to keep the template data source around
                this._itemMap = $.map(this._dataSource, $.proxy(this._wrapSingleItem, this));

                this.rerender(); // the list control is completely live!

                this.trigger_modelChanged();
            }
        }
        , items: function List$items() {
            ///<summary>
            /// Items is just an alias for the dataSource method
            ///</summary>
            return this.dataSource.apply(this, arguments);
        }
        , isEmpty: function List$isEmpty() {
            ///<summary>
            /// Determines whether the model has any items or not.
            ///</summary>
            ///<returns>true if the model does not contain any elements, false otherwise</returns>
            return this._dataSource.length === 0;
        }
        , count: function List$count() {
            ///<summary>
            /// Returns the number of items in the model.
            ///</summary>
            return this._dataSource.length;
        }
        , indexOf: function List$indexOf(item) {
            ///<summary>
            /// Performs a by-reference search in the dataSource for the passed in item.
            ///</summary>
            ///<param name="item">The item to look for.</param>
            ///<returns>An index into the model array if found, -1 if not found.</returns>

            for (var i = 0, n = this._dataSource.length; i < n; ++i) {
                if (this._dataSource[i] === item) {
                    return i;
                }
            }

            return -1;
        }
        , addItem: function List$addItem(index, item) {
            ///<summary>
            /// Adds a new item to the model. Optionally, an index parameter can be specified
            /// to determine where in the array the new item should be inserted.
            ///</summary>
            ///<param name="index" optional="true">The location to insert the new element.</param>
            ///<param name="item">The item to insert into the model.</param>
            ///<remarks>
            /// Note that because the model is live, this method will immediately update the DOM
            ///</remarks>
            if (typeof (index) === 'object') {
                item = index;
                index = undefined;
            }

            var wrappedItem = this._wrapSingleItem(item);
            var domNode = this._renderSingleItem(wrappedItem);
            domNode.removeAttr('data-guid');

            if (typeof index !== 'undefined') {
                Sys.Debug.assert(index >= 0 && index <= this._dataSource.length, 'addItem: index out of range.');

                this._dataSource.splice(index, 0, item);
                this._itemMap.splice(index, 0, wrappedItem);

                if (index === 0) {
                    this._containerElement.prepend(domNode);
                } else {
                    this._itemMap[index - 1].domNode.after(domNode);
                }
            } else {
                this._dataSource.push(item);
                this._itemMap.push(wrappedItem);

                this._containerElement.append(domNode);
            }

            this.trigger_modelChanged();
        }
        , removeItem: function List$removeItem(argv) {
            ///<summary>
            /// Removes an item out of the model, either by index or by reference.
            ///</summary>
            ///<param name="argv">
            /// If argv is an object, then this function searches the dataSource and performs a reference comparison
            /// looking for argv. If found, the item is removed out of the model, if not found, no further action
            /// is performed.        
            /// If argv is an integer, then this function removes the item at the given index if it is valid.
            ///</param>
            ///<remarks>
            /// Note that because the model is live, this method will immediately update the DOM.
            ///</remarks>
            var index, item;
            if (typeof (argv) === 'object') {
                item = argv;
            } else if (typeof (argv) === 'number') {
                index = argv;
            }

            if (item) {
                index = this.indexOf(item);
            }

            if (index >= 0) {
                this._dataSource.splice(index, 1);
                var removedItem = this._itemMap.splice(index, 1);

                $.each(removedItem[0].componentChildren || [], function () {
                    this.dispose();
                });
                removedItem[0].domNode.remove();

                this.trigger_modelChanged();
            }
        }
        , _clear: function List$_clear() {
            ///<summary>
            /// PRIVATE Method: Internal function to empty out the model and the DOM.
            ///</summary>
            $.each(this._itemMap, function () {
                $.each(this.componentChildren || [], function () {
                    this.dispose();
                });
            });

            this._dataSource = [];
            this._itemMap = [];
            this._guid = 0;

            if (this._containerElement) {
                this._containerElement.empty();
            }
        }
        , clear: function List$clear() {
            ///<summary>
            /// Removes all of the elements in the model.
            ///</summary>
            ///<remarks>
            /// Note that because the model is live, this function will immediately update the DOM
            ///</remarks>
            this._clear();

            this.trigger_modelChanged();
        }
        , item: function List$item(index, value) {
            ///<summary>
            /// Getter/Setter
            ///
            /// Given only the index arguments, will retrieve the item at the given index.
            /// Given both index and value arguments, will set the item at the given index to the specified value.
            ///</summary>
            ///<param name="index">The index of the item to look at.</param>
            ///</param name="value" optional="true">The new item to place in that index.</param>
            ///<remarks>
            /// Note that becaouse the model is live, this function will immediately update the DOM.
            /// Note that the index parameter is validated using debugger assert statements.
            ///</remarks>
            Sys.Debug.assert(index >= 0 && index < this._dataSource.length, 'item: index out of range.');

            if (arguments.length === 2) {
                //set
                Sys.Debug.assert(typeof (value) !== 'undefined', 'item: value is undefined.');

                var removedItem = this._itemMap[index];

                this._dataSource[index] = value;
                this._itemMap[index] = this._wrapSingleItem(value, index);

                removedItem.domNode.remove();

                this._renderSingleItem(this._itemMap[index]);
                this._itemMap[index].domNode.removeAttr('data-guid');

                if (index > 0) {
                    this._itemMap[index - 1].domNode.after(this._itemMap[index].domNode);
                } else {
                    this._containerElement.prepend(this._itemMap[index].domNode);
                }

                this.trigger_modelChanged();
            } else {
                //get
                return this._dataSource[index];
            }
        }
        , trigger_modelChanged: function List$trigger_modelChanged() {
            $(this).trigger('modelChanged');
        }
        , trigger_itemRendered: function List$trigger_itemRendered(data, domNode) {
            $(this).trigger('itemRendered', { item: data, domNode: domNode });
        }
    });

    window.getComponentType = function () {
        return List;
    }

})(jQuery);