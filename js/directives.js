'use strict';

/* Directives */

function arrangeDefinition(definitions) {
    var temp = '';
    angular.forEach(definitions, function(item, i) {
        temp = temp + '(' + (i + 1) + ') ' + definitions[i].meanings[0].meaning + ' \n';
    });
    return temp;
}

angular.module('myApp.directives', []).
  directive('appVersion', ['version', function(version) {
    return function(scope, elm, attrs) {
  		elm.text(version);
	};
}])
.directive('autoFocus', function($timeout) {
    return {
        restrict: 'AC',
        link: function(_scope, _element) {
            $timeout(function(){
                _element[0].focus();
            }, 0);
        }
    };
})
.directive("popuphover", function() {
    return { 
        restrict: "A",
        link: function(scope, element, attrs, ngModelCtrl) {
        	var popover = element.popover().on('show.bs.popover', function () {	
			  	$.get('https://www.googleapis.com/scribe/v1/research?key=AIzaSyDqVYORLCUXxSv7zneerIgC2UYMnxvPeqQ&dataset=dictionary&dictionaryLanguage=en&query='+scope.message.text, function(data) {
	            	if (data.data) {
                        console.log(data.data);
	            		var definitions = data.data[0].dictionaryData.definitionData;
                        popover.attr('data-content', arrangeDefinition(definitions));
	            		// popover.attr('data-content', );
	            		element.data('bs.popover').setContent();
	            	}
	            });
			});	
		}
    }
});
