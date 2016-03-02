angular.module('durakApp.animations', ['ngAnimate']).
  animation('.hand-card', [function() {
    console.log('hand-card animation loading');
    return {
      enter : function(element, done) {
        jQuery(element).css('top', "500px");
        jQuery(element).animate({top: "0px"}, 1000, done);
      },
      leave : function(element, done) {
        jQuery(element).animate({top: "500px"}, 1000, done);
      }
    }
  }]).
  animation('.player-card', [function() {
    console.log('plyer-card animation loading');
    return {
      enter: function(element, done) {
        console.log('id', jQuery(element).attr('id'));
        jQuery(element).css('left', "0px");
        jQuery(element).animate({left: parseInt(jQuery(element).attr('id'), 10) * 15 + "px"}, 500, done);
      },
      leave: function(element, done) {
        console.log('leaving');
      }
    }
  }]).
  animation('.pair-attack', [function() {
    return {
      enter: function(element, done) {
        jQuery(element).css('top', "-500px");
        jQuery(element).animate({top: "0px"}, 1000, done);
      },
      leave: function(element, done) {
        jQuery(element).animate({top: "500px"}, 1000, done);
      }
    }
  }]).
  animation('.pair-defend', [function() {
    return {
      enter: function(element, done) {
        jQuery(element).css('top', '-500px');
        jQuery(element).css('left', '-75px');
        jQuery(element).animate({top: "-30px"}, 1000, done);
      }
    }
  }]).
  animation('.temp-card', [function() {
    return {
      enter: function(element, done) {
        jQuery(element).css('left', '500px');
        jQuery(element).css('top', "20px");
        jQuery(element).animate({left: "0px"}, 1000, done);
      },
      leave: function(element, done) {
        jQuery(element).animate({left: "500px"}, 1000, done);
      }
    }
  }]);