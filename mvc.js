function Event(sender) {
    this._sender = sender;
    this._listeners = [];
}

Event.prototype = {
    attach: function (listener) {
        this._listeners.push(listener);
    },
    notify: function (args) {
        var index;
        for (index = 0; index < this._listeners.length; index += 1) {
            this._listeners[index](this._sender, args);
        }
    }
};

// The model stores items and notifies observers about changes.
function ChoiceModel() {

    this._frames = all_frames;
    this._frames_descr = all_frames_descr;
    this._frames_allowed = new Array(all_frames.length);
    for (var i = 0; i < all_frames.length; ++i) { this._frames_allowed[i] = true; }
    this._selectedIndex = -1;

    this._framestyles = all_framestyles;
    this._framestyles_descr = all_framestyles;
    this._framestyles_allowed = new Array(all_framestyles.length);
    for (var i = 0; i < all_framestyles.length; ++i) { this._framestyles_allowed[i] = true; }
    this._selectedFramestyle = -1;

    this.itemAdded = new Event(this);
    this.itemRemoved = new Event(this);
    this.selectedIndexChanged = new Event(this);
    this.selectedIndex2Changed = new Event(this);
}

ChoiceModel.prototype = {
    getItems: function () {
        return [].concat(this._frames);
    },

    getDescriptions: function () {
        return [].concat(this._frames_descr);
    },

    getAllowed: function () {
        return [].concat(this._frames_allowed);
    },

    getItems2: function () {
        return [].concat(this._framestyles);
    },

    getDescriptions2: function () {
        return [].concat(this._framestyles_descr);
    },

    getAllowed2: function () {
        return [].concat(this._framestyles_allowed);
    },

    addItem: function (item) {
        this._frames.push(item);
        this.itemAdded.notify({
            item: item
        });
    },

    removeItemAt: function (index) {
        var item;
        item = this._frames[index];
        this._frames.splice(index, 1);
        this.itemRemoved.notify({
            item: item
        });
        if (index === this._selectedIndex) {
            this.setSelectedIndex(-1);
        }
    },

    getSelectedIndex: function () {
        return this._selectedIndex;
    },

    getSelectedIndex2: function () {
        return this._selectedIndex2;
    },

    setSelectedIndex: function (index) {
        var previousIndex;
        previousIndex = this._selectedIndex;
        this._selectedIndex = index;
        this.selectedIndexChanged.notify({
            previous: previousIndex
        });
    },

    setSelectedIndex2: function (index2) {
        var previousIndex;
        previousIndex2 = this._selectedIndex2;
        this._selectedIndex2 = index2;
        this.selectedIndex2Changed.notify({
            previous: previousIndex2
        });
    },

    get_allowed: function (contr, frame) {
        // open connection to IndexedDB
        // walk through all framestyles
        // if a framestyle has the right frame, set corresponding _framestyles_allowed[i] to true,
        // else to false

        // open IndexedDB and load all combinations stored therein
        var request = indexedDB.open("framestyles", 3);
        request.onsuccess = function (e1) {
            var db = request.result;
            var transaction = db.transaction(["framestyles"], "readwrite");
            var objectStore = transaction.objectStore("framestyles");
            // find all available frames
            var ob = objectStore.openCursor().onsuccess = function(event){
                var cursor = event.target.result;
                // if there is still another cursor to go, keep runing this code
                if(cursor) {
                    if(cursor.value.frame == frame){
                        var changed = cursor.value;
                        changed.allowed = "true";
                        cursor.update(changed);
                    } else {
                        var changed = cursor.value;
                        changed.allowed = "false";
                        cursor.update(changed);
                    }
                    cursor.continue();
                } else {
                    // if there are no more cursor items to iterate through, say so, and exit the function
                    //alert('cursor run through IndexedDB products finished')
                }
            }
        }

    }

};

// The view presents the model and provides the UI events, which the controller is attached to.
function ChoiceView(model, elements) {
    this._model = model;
    this._elements = elements;
    this.listModified = new Event(this);
    this.list2Modified = new Event(this);

    var _this = this;
    // attach listeners to HTML controls for frames
    // don't display list of wrong framestyles
    this._elements.list.change(function (e) {
        _this.listModified.notify({
            index: e.target.selectedIndex
        });
        // DONE ask model to update allowed framestyles
    });

    // attach listeners to HTML controls for framestyles
    this._elements.list2.change(function (e) {
        _this.list2Modified.notify({
            index: e.target.selectedIndex
        });
    });

}

ChoiceView.prototype = {
    show: function () {
        this.rebuildChoice_frame();
        this.rebuildChoice_framestyle();
    },

    rebuildChoice_frame: function () {
        var list, items, key;

        list = this._elements.list;
        list.html('');
        items = this._model.getItems();
        allowed = this._model.getAllowed();
        descr = this._model.getDescriptions();
        for (key in items) {
            if (items.hasOwnProperty(key) && allowed[key] == true) {
                list.append($('<option data-img-label="' +
                              '<span id=\'text_'+items[key]+'\' class=\'selection\'><span id=\'box_'+items[key]+'\' class=\'box\'></span><span class=\'descr\'>' + descr[key] + '</span></span>' +
                              '" data-img-src="src/frame/'+items[key]+'/inactive.png" value="'+items[key]+'">'+
                              '</option>'));
            }
        }
        list.imagepicker({
            hide_select : true,
            show_label  : true
        })
        this._model.setSelectedIndex(-1);
    },

    rebuildChoice_framestyle: function () {
        var list2, items2, key2;
        list2 = this._elements.list2;
        list2.html('');
        var request = indexedDB.open("framestyles", 3);
        //console.log("request", request);
        request.onsuccess = function (e1) {
            //console.log('success opening framestyles');
            var db = request.result;
            var transaction = db.transaction(["framestyles"], "readonly");
            var objectStore = transaction.objectStore("framestyles");
            //console.log('objectStore:', objectStore);
            // find all available frames
            var ob = objectStore.openCursor().onsuccess = function(event){
                var cursor = event.target.result;
                //console.log('success: ', cursor);
                // if there is still another cursor to go, keep runing this code
                if(cursor) {
                    //console.log('allowed', cursor.value.allowed);
                    if(cursor.value.allowed == "true"){
                        list2.append($('<option data-img-label="' +
                                       '<span id=\'text_'+cursor.value.framestyle+'\' class=\'selection\'><span id=\'box_'+cursor.value.framestyle+'\' class=\'box\'></span><span class=\'descr\'>' + cursor.value.description + '</span></span>' +
                                       '" data-img-src="src/framestyle/'+cursor.value.framestyle+'/inactive.jpg" value="'+cursor.value.framestyle+'">'+
                                       '</option>'));
                        //console.log("list2: ", list2);
                    } else {
                        //console.log('cursor.value', cursor.value);
                    }
                    cursor.continue();
                } else {

                    // if there are no more cursor items to iterate through, say so, and exit the function
                    //alert('cursor run through IndexedDB products finished')
                    //console.log("starting imagepicker");
                    list2.imagepicker({
                        hide_select : true,
                        show_label  : true
                    })
                }

            }

        }
    }
};

// The Controller. It responds to user actions and invokes changes on the model.
function ChoiceController(model, view) {
    this._model = model;
    this._view = view;
    var _this = this;

    this._view.listModified.attach(function (sender, args) {
        _this.updateSelected(args.index);
        // go through whole database of framestyles, turn off wrong selections
        _this._model.get_allowed(_this, all_frames[args.index]);
        _this._view.rebuildChoice_framestyle();
    });

    this._view.list2Modified.attach(function (sender, args) {
        _this.updateSelected(args.index);
    });

}

ChoiceController.prototype = {
    addItem: function () {
        var item = window.prompt('Add item:', '');
        if (item) {
            this._model.addItem(item);
        }
    },

    delItem: function () {
        var index;
        index = this._model.getSelectedIndex();
        if (index !== -1) {
            this._model.removeItemAt(this._model.getSelectedIndex());
        }
    },

    updateSelected: function (index) {
        this._model.setSelectedIndex(index);
    },

    updateSelected2: function (index) {
        this._model.setSelectedIndex2(index);
    }
};




$(function () {
    // create IndexedDB database to hold products and frames on the client's side

    // remove deletion for speedup, set selection back, all allowed
    //indexedDB.deleteDatabase("products");
    var request = indexedDB.open("products", 2);
    request.onupgradeneeded = function() {
        console.log('new readin products')
        var db = request.result; // database did not previously exist, so create object stores and indexes.
        var store = db.createObjectStore("products", {keyPath: "product"});
        var productIndex = store.createIndex("by_product", "product", {unique: true});
        var frameIndex = store.createIndex("by_frame", "frames");
        // Populate with initial data. This needs to be done only once, with all fields filled in from .csv file
        for(var i=0; i<products.length; i++){
            var cur = products[i]
            store.put({product: cur.product, brand: cur.brand, frames: cur.frames, quality: cur.quality,
                       glasstype: cur.glasstype, tints: cur.tints, minorga: cur.minorga, n: cur.n,
                       pricemin:cur.pricemin, pricemax:cur.pricemax});
        }
        db.close();
    };
    request.onsuccess = function() {
        db = request.result;
    };

    //indexedDB.deleteDatabase("framestyles");
    var request2 = indexedDB.open("framestyles", 3);
    request2.onupgradeneeded = function() {
        console.log('new readin framestyles');
        var db2 = request2.result; // database did not previously exist, so create object stores and indexes.
        var store2 = db2.createObjectStore("framestyles", {keyPath: "framestyle"});
        var titleIndex2 = store2.createIndex("by_framestyle", "framestyle", {unique: true});
        // Populate with initial data. This needs to be done only once, with all fields filled in from .csv file
        for(var i=0; i<framestyles.length; i++){
            var cur = framestyles[i]
            store2.put({framestyle: cur.framestyle, vk: cur.vk, hypovk: cur.hypovk, zusatz: cur.zusatz,
                        picture: cur.picture, a: cur.a, b: cur.b, c: cur.c, frame:cur.frame,
                        description:cur.description, allowed:cur.allowed});
        }
        db2.close();
    };
    request2.onsuccess = function() {
        db2 = request2.result;
    };

    // create Model-View-Controller framework for use with user choice
    model = new ChoiceModel()
    view_frame = new ChoiceView(model, {
        'list': $('#frames'),
        'list2': $('#framestyles'),
        'glasstype': $('#glasstype')
    })
    controller = new ChoiceController(model, view_frame);
    view_frame.show();
    // db.close();
});

// Local Variables:
// mode: outline-minor
// outline-regexp: "\\(function *\\|Choice*\\|Event*\\|var *\\|document.*\\|showHide*\\)":
// End:
