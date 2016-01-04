var express = require('express');
var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

app.use(express.static(__dirname + '/angular-front-end'));


app.get('/', function (req, res) {
    res.sendfile('index.html');
});

var usernames={};
//public chat is one of the user in the all users information
var allUsers=[{nickname:"",color:"#000"}];
io.on('connection',function(socket){

    socket.on('addUser',function(data){
        //if the nickname has been used
        if (usernames[data.nickname]) {
          socket.emit('loginResult',{result:false});
        } else {
            socket.emit('loginResult',{result:true});
            socket.nickname = data.nickname;
            //record the information for private chat
            usernames[socket.nickname] = socket;
            allUsers.push(data);
            //send the welcome message to all users except himself
            socket.broadcast.emit('userAdded',data);
            //send all users' information to the user just logined
            socket.emit('allUser',allUsers);
        }
    });

    //there is someone sent messages
    socket.on('addMessage',function(data){
        //message a specific user
        if (data.to) {
            usernames[data.to].emit('messageAdded',data);
        } 
        //for group chat
        else {
            //send messages to all users except the user who sent it 
            socket.broadcast.emit('messageAdded',data);
        }
    });


    //someone has left
    socket.on('disconnect', function () {  
            socket.broadcast.emit('userRemoved', {
                nickname: socket.nickname
            });
            for(var i=0;i<allUsers.length;i++){
                if(allUsers[i].nickname==socket.nickname){
                    allUsers.splice(i,1);
                }
            }
            //delete the name from the name list
            delete usernames[socket.nicknFame];
        });
});

server.listen(3000, function () {
    console.log('Let\'s chat!');
});