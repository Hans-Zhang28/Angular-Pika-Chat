
var app = angular.module("chatRoom", []);

app.factory('socket',  function($rootScope) {
    //for setting up the default server for the web
    var socket = io();
    return {
        on: function(eventName, callback) {
            socket.on(eventName, function() {
                var args = arguments;
                //dirty checking on variables
                $rootScope.$apply(function() {
                    callback.apply(socket, args);
                });
            });
        }, 
        emit: function(eventName, data, callback) {
            socket.emit(eventName, data, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    if(callback) {
                        callback.apply(socket, args);
                    }
                });
            });
        }
    };
});

app.factory('randomColor', function($rootScope) {
    return {
        newColor: function() {
            return '#'+('00000'+(Math.random()*0x1000000<<0).toString(16)).slice(-6);
        }
    };
});

app.factory('userService', function($rootScope) {
    return {
        get: function(users, nickname) {
            if (users instanceof Array) {
                for (var i = 0; i < users.length; i++) {
                    if (users[i].nickname === nickname) {
                        return users[i];
                    }
                }
            } else {
                return null;
            }
        }
    };
});

app.controller("chatCtrl", ['$scope', 'socket', 'randomColor', 'userService', function($scope, socket, randomColor, userService){
    var messageWrapper = $('.message-wrapper');
    $scope.hasLogined = false;
    //in default the message will be sent to public
    $scope.receiver = "";
    //the collection of public messages
    $scope.publicMessages = [];
    //the collection of private messages
    $scope.privateMessages = {};
    //in default the messages will be demonstrated to public
    $scope.messages = $scope.publicMessages;
    $scope.users = [];
    //the color of the current user
    $scope.color = randomColor.newColor();
    $scope.login = function(){ 
        socket.emit("addUser", {nickname:$scope.nickname, color:$scope.color});
    }
    $scope.scrollToBottom = function(){
        messageWrapper.scrollTop(messageWrapper[0].scrollHeight);
    }
    $scope.postMessage = function(){
        var message = {text:$scope.words,  type:"normal", color:$scope.color, from:$scope.nickname, to:$scope.receiver};
        var receiver = $scope.receiver;
        //for private messages
        if (receiver){
           if (!$scope.privateMessages[receiver]){
               $scope.privateMessages[receiver] = [];
           }
            $scope.privateMessages[receiver].push(message);
        //for public messages
        } else {
            $scope.publicMessages.push(message);
        }
        //clean the message
        $scope.words = "";
        //message cannot be sent to himself
        if (receiver !== $scope.nickname) {
            socket.emit("addMessage",  message);
        }
    }
    $scope.setReceiver = function(receiver){
        $scope.receiver = receiver;
        //for private messages
        if (receiver) { 
            if(!$scope.privateMessages[receiver]){
                $scope.privateMessages[receiver] = [];
            }
            $scope.messages = $scope.privateMessages[receiver];
        //for public messages
        } else {
            $scope.messages = $scope.publicMessages;
        }
        var user = userService.get($scope.users, receiver);
        if (user){
            user.hasNewMessage = false;
        }
    }

    socket.on('loginResult', function(data){
        if (data.result) {
            $scope.userExisted = false;
            $scope.hasLogined = true;
        } else {
            //if the username has been used
            $scope.userExisted = true;
        }
    });

    socket.on('userAdded', function(data) {
        if (!$scope.hasLogined) return;
        $scope.publicMessages.push({text:data.nickname, type:"welcome"});
        $scope.users.push(data);
    });

    //receive user information
    socket.on('allUser', function(data) {
        if (!$scope.hasLogined) return;
        $scope.users = data;
    });

    //receive messages that some user left
    socket.on('userRemoved', function(data) {
        if (!$scope.hasLogined) return;
        $scope.publicMessages.push({text:data.nickname, type:"bye"});
        for (var i = 0; i<$scope.users.length; i++){
            if ($scope.users[i].nickname == data.nickname){
                $scope.users.splice(i, 1);
                return;
            }
        }
    });

    socket.on('messageAdded', function(data) {
        if (!$scope.hasLogined) return;
        //for private messages
        if (data.to) {
            if (!$scope.privateMessages[data.from]) {
                $scope.privateMessages[data.from] = [];
            }
            $scope.privateMessages[data.from].push(data);
        } else {
            //for public messages
            $scope.publicMessages.push(data);
        }
        var fromUser = userService.get($scope.users, data.from);
        var toUser = userService.get($scope.users, data.to);
        //"Unread" will only be showed when the sender and receiver are not chatting
        if($scope.receiver !== data.to) {
            //for private messages
            if (fromUser && toUser.nickname) {
                fromUser.hasNewMessage = true;
            } else {
                //for public messages
                toUser.hasNewMessage = true;
            }
        }
    });



}]);

app.directive('message',  ['$timeout', function($timeout) {
    return {
        restrict: 'E', 
        templateUrl: 'message.html', 
        scope:{
            info:"=", 
            self:"=", 
            scrolltothis:"&"
        }, 
        link:function(scope,  elem,  attrs){
                scope.time = new Date();
                $timeout(scope.scrolltothis);
                $timeout(function(){
                    elem.find('.avatar').css('background', scope.info.color);
                });
        }
    };
}]).directive('user',  ['$timeout', function($timeout) {
        return {
            restrict: 'E', 
            templateUrl: 'user.html', 
            scope:{
                info:"=", 
                iscurrentreceiver:"=", 
                setreceiver:"&"
            }, 
            link:function(scope,  elem,  attrs, chatCtrl){
                $timeout(function(){
                    elem.find('.avatar').css('background', scope.info.color);
                });
            }
        };
    }]);
