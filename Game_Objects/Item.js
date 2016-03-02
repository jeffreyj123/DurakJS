/*
		Item Class
		
		File must be included with the following dependencies:
			Container
	*/

var method = Item.prototype;

function Item(info) {
	this.name = info.name;
	this.container = null;
}

method.setContainer = function(id, container) {
	if (typeof(container) == 'undefined') {
		throw new Error('Container undefined');
	}
  try {
    this.container.removeItem(id);
	} catch (err) {
		console.log('Container property of item not set');
	}
  container.addItem(id, this);
  this.container = container;
}

module.exports = Item;