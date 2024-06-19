var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var ks = require('node-key-sender');
var nutjs = require('@nut-tree-fork/nut-js');

app.use(express.static(__dirname));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
  socket.on('jawOpen', async function(data) {
    console.log('message from client: ', data);
    await nutjs.keyboard.pressKey(nutjs.Key.LeftAlt);
    await nutjs.keyboard.pressKey(nutjs.Key.Tab);
    await nutjs.keyboard.releaseKey(nutjs.Key.LeftAlt);
    await nutjs.keyboard.releaseKey(nutjs.Key.Tab);
  });
  socket.on('mouse', async function(data) {
    console.log('message from client: ', data);
    await nutjs.mouse.move(new nutjs.Point(data.x, data.y));
  });
  socket.on('lclick', async function(data) {
    console.log('message from client: ', data);
    await nutjs.mouse.leftClick();
  });
  socket.on('rclick', async function(data) {
    console.log('message from client: ', data);
    await nutjs.mouse.rightClick();
  });
});

server.listen(3000, function() {
  console.log('Socket IO server listening on port 3000');
});
  