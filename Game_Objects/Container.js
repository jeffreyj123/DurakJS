/*
    Container Class

    File must be included with the following dependencies:
      Item
  */

var method = Container.prototype;

function Container(items) {
  this.items = {};
  if (typeof items === 'undefined') {
    items = [];
  }
  for (var item of items) {
    item[1].setContainer(item[0], this);
  }
  this.numItems = items.length;

  this[Symbol.iterator] = this.iterator; 
}

method.iterator = function() {
  var items = this.items;
  var keys = Object.keys(items);
  var index = 0;

  return {
    next: function() {
      return index < keys.length ?
        {value: items[keys[index++]], done: false} :
        {done: true};
    }
  }
}

method.addItem = function(id, item) {
  if (typeof item == 'undefined') {
    throw new Error('Item undefined');
  }
  this.items['_' + id] = item;
  this.numItems++;
  return item;
}

method.removeItem = function(id) {
  var item = this.getItem(id);
  if (item.container) {
    item.container = null;
  }
  delete this.items['_' + id];
  this.numItems--;
  return item;
}

method.getItem = function(id) {
  try {
    return this.items['_' + id];
  }
  catch(err) {
    console.log('select card at index ' + id + ' not found');
    return null;
  }
}

method.top = function() {
  if (this.numItems != 0)
    return this.items[Object.keys(this.items)[0]];
  return null;
}

method.entries = function() {
  var entries = [];
  for (var key of Object.keys(this.items)) {
    entries.push([key.substr(1), this.items[key]]);
  }
  return entries;
}

method.setEqual = function(container) {
  for (var item of this.entries()) {
    this.removeItem(item[0]);
  }
  for (var item of container.entries()) {
    this.addItem(item[0], item[1]);
  }
}

module.exports = Container;