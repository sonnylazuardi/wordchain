'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
.controller('HomeCtrl', ['$scope', 'syncData', function($scope, syncData) {
   syncData('syncedValue').$bind($scope, 'syncedValue');
}])

.controller('GameCtrl', ['$scope', 'syncData', function($scope, syncData) {
   $scope.newMessage = null;
   syncData(['users', $scope.auth.user.uid]).$bind($scope, 'user');

   // constrain number of messages by limit into syncData
   // add the array into $scope.messages
   $scope.messages = syncData('messages', 10);

   // add new messages to the list
   $scope.addMessage = function() {
      if( $scope.newMessage ) {
         $.get('https://www.googleapis.com/scribe/v1/research?key=AIzaSyDqVYORLCUXxSv7zneerIgC2UYMnxvPeqQ&dataset=dictionary&dictionaryLanguage=en&query='+$scope.newMessage, function(data) {
            if (data.data) {
               var keys = $scope.messages.$getIndex();
               if (keys.length) {
                  var lastkey = keys[keys.length-1];
                  var lastword = $scope.messages[lastkey].text;
                  var lastchar = lastword[lastword.length-1];
                  if ($scope.newMessage[0] == lastchar) {
                     $scope.messages.$add({text: $scope.newMessage, fbid: $scope.user.fbid});
                     $scope.user.highscore += $scope.newMessage.length;
                     $scope.newMessage = null; 
                     angular.element('#word').popover('hide');
                  } else {
                     angular.element('#word').attr('data-content', 'The word doesn\'t started with character "'+lastchar+'"').popover('show');
                  }
               }
            } else {
               angular.element('#word').attr('data-content', 'The word is not found in dictionary').popover('show');
            }
            setTimeout(function(){
               angular.element('#word').popover('hide');
            }, 2000);
         });    
      }
   };
}])

.controller('DictionaryCtrl', ['$scope', '$location', function($scope, $location) {
   $scope.word = '';
   $scope.definitions = [];
   $scope.loading = false;
   $scope.typed = function() {
      if ($scope.word.length == 4) {
         var searchword = $scope.word.substr(0,4);
         $.get('http://en.wiktionary.org/w/api.php?search='+searchword+'&action=opensearch', function(data) {
            console.log(data[1]);
            angular.element('#word-box').typeahead('destroy').typeahead({source: data[1]});
         }, 'jsonp');
      }
   }
   $scope.search = function() {
      angular.element('.loader').fadeIn(1000);
      $.get('https://www.googleapis.com/scribe/v1/research?key=AIzaSyDqVYORLCUXxSv7zneerIgC2UYMnxvPeqQ&dataset=dictionary&dictionaryLanguage=en&query='+$scope.word, function(data) {
         console.log(data);
         angular.element('.loader').fadeOut(1000);
      // console.log(data.data[0].dictionary.definitionData);
      $scope.definitions = data.data[0].dictionary.definitionData;
      $scope.$apply();
   }, 'jsonp');
   }
   $scope.back = function() {
      $location.path('/');
   }
   angular.element('.loader').hide();
}])

.controller('LoginCtrl', ['$scope', 'loginService', '$location', 'syncData',  function($scope, loginService, $location, syncData) {
   $scope.email = null;
   $scope.pass = null;
   $scope.confirm = null;
   $scope.createMode = false;
   $scope.messages = syncData('messages', 10);

   $scope.login = function(cb) {
         loginService.login(null, null, function(err, user) {
            $scope.err = err? err + '' : null;
            if (!err) {
               var sync = syncData(['users', $scope.auth.user.uid]);
               console.log(sync);
               sync.$on('loaded', function() {
                  console.log(sync);
                  if (!sync.name) {
                     console.log(sync);
                     sync.name = user.username;
                     sync.fbid = user.id;
                     sync.highscore = 0;
                     sync.$save();
                  }
               });
               cb && cb(user);
            }
         });
      };

      $scope.createAccount = function() {
         $scope.err = null;
         if( assertValidLoginAttempt() ) {
            loginService.createAccount($scope.email, $scope.pass, function(err, user) {
               if( err ) {
                  $scope.err = err? err + '' : null;
               }
               else {
                  // must be logged in before I can write to my profile
                  $scope.login(function() {
                     loginService.createProfile(user.uid, user.email);
                     $location.path('/account');
                  });
               }
            });
         }
      };

      function assertValidLoginAttempt() {
         if( !$scope.email ) {
            $scope.err = 'Please enter an email address';
         }
         else if( !$scope.pass ) {
            $scope.err = 'Please enter a password';
         }
         else if( $scope.pass !== $scope.confirm ) {
            $scope.err = 'Passwords do not match';
         }
         return !$scope.err;
      }
   }])

.controller('AccountCtrl', ['$scope', 'loginService', 'syncData', '$location', function($scope, loginService, syncData, $location) {
   syncData(['users', $scope.auth.user.uid]).$bind($scope, 'user');

   $scope.logout = function() {
      loginService.logout();
   };

   $scope.oldpass = null;
   $scope.newpass = null;
   $scope.confirm = null;

   $scope.reset = function() {
      $scope.err = null;
      $scope.msg = null;
   };

   $scope.updatePassword = function() {
      $scope.reset();
      loginService.changePassword(buildPwdParms());
   };

   function buildPwdParms() {
      return {
         email: $scope.auth.user.email,
         oldpass: $scope.oldpass,
         newpass: $scope.newpass,
         confirm: $scope.confirm,
         callback: function(err) {
            if( err ) {
               $scope.err = err;
            }
            else {
               $scope.oldpass = null;
               $scope.newpass = null;
               $scope.confirm = null;
               $scope.msg = 'Password updated!';
            }
         }
      }
   }

}]);