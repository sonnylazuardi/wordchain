'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
.controller('HomeCtrl', ['$scope', 'syncData', function($scope, syncData) {
   syncData('syncedValue').$bind($scope, 'syncedValue');
}])

.controller('HallCtrl', ['$scope', 'syncData', function($scope, syncData) {
   var sync = syncData('users');//.$bind($scope, 'users');
   $scope.users = null;
   $scope.keys = null;
   $scope.halls = [];
   sync.$on('loaded', function() {
      $scope.users = sync;
      $scope.keys = $scope.users.$getIndex();
      for(var i = 0; i < $scope.keys.length; i++) {
         $scope.halls.push($scope.users[$scope.keys[i]]);
      }
   });
   
}])

.controller('GameCtrl', ['$scope', 'syncData', function($scope, syncData) {
   $scope.newMessage = null;
   syncData(['users', $scope.auth.user.uid]).$bind($scope, 'user');
   // angular.element('.board').popover();
   // constrain number of messages by limit into syncData
   // add the array into $scope.messages
   $scope.messages = syncData('messages', 10);

   $scope.checkExist = function(word) {
      var keys = $scope.messages.$getIndex();
      var found = false;
      for (var i = 0; i < keys.length; i++) {
         if ($scope.messages[keys[i]].text == word) {
            found = true;
            break;
         }
      }
      return found;
   }

   // add new messages to the list
   $scope.addMessage = function() {
      var baru = $scope.newMessage.toLowerCase();
      if( baru ) {
         $.get('https://www.googleapis.com/scribe/v1/research?key=AIzaSyDqVYORLCUXxSv7zneerIgC2UYMnxvPeqQ&dataset=dictionary&dictionaryLanguage=en&query='+baru, function(data) {
            if (data.data) {
               var keys = $scope.messages.$getIndex();
               if (keys.length) {
                  var lastkey = keys[keys.length-1];
                  var lastword = $scope.messages[lastkey].text;
                  var lastchar = lastword[lastword.length-1];
                  var alpha = /^[A-Za-z ]+$/;
                  if (baru.match(alpha)) {
                     if (baru.length >= 3) {
                        if (!$scope.checkExist(baru)) {
                           if (baru[0] == lastchar) {
                              $scope.messages.$add({text: baru, fbid: $scope.user.fbid});
                              $scope.user.highscore += baru.length;
                              // $scope.lasttry = $scope.newMessage;
                              $scope.newMessage = null; 
                              angular.element('#word').popover('hide');
                           } else {
                              angular.element('#word').attr('data-content', 'The word doesn\'t started with character "'+lastchar+'"').popover('show');
                           }
                        } else {
                           angular.element('#word').attr('data-content', 'The word has been answered before').popover('show');
                        }
                     } else {
                        angular.element('#word').attr('data-content', 'The word must be 3 characters or more').popover('show');
                     }
                  } else {
                     angular.element('#word').attr('data-content', 'The word must consist of alphabet only').popover('show');
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
   angular.element('#word').on('click', function() {
      angular.element('#word').attr('data-content', '...').popover('hide');
   });
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
      angular.element('.loader').fadeTo(1000, 1)
      $.get('https://www.googleapis.com/scribe/v1/research?key=AIzaSyDqVYORLCUXxSv7zneerIgC2UYMnxvPeqQ&dataset=dictionary&dictionaryLanguage=en&query='+$scope.word, function(data) {
         console.log(data);
         angular.element('.loader').fadeTo(1000, 0)
      // console.log(data.data[0].dictionary.definitionData);
      $scope.definitions = data.data[0].dictionary.definitionData;
      $scope.$apply();
   }, 'jsonp');
   }
   $scope.back = function() {
      $location.path('/');
   }
   angular.element('.loader').fadeTo(0, 0)
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
