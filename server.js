const express = require('express');
const app = express();
const http = require('http');
const webSocket = require('socket.io');
const server = http.createServer(app);
const io = webSocket(server);
const session = require('express-session');
const sharedSession = require('express-socket.io-session');
const path = require('path');

//Creating MiddleWare
const sessionMiddleWare = session({
    secret: "secret",
    resave: false,
    saveUninitialized: true
});

app.use(sessionMiddleWare); // Use it with express

// Share the session with Socket.IO
io.use(sharedSession(sessionMiddleWare, {
    autoSave: true
}));

app.use(express.static('public'));

const port = 5000; // ✅ Define the port

const todosByRoom = {};
const usersInRoom = {};

io.on('connection', (socket) => {

    const session = socket.handshake.session;
    const sessionId = session.id;

    console.log('Connected. Current session:', sessionId, socket.id);
    if (!session.room || !session.username) {
        console.log('New user');
        socket.on('start-app', () => {
            socket.emit('request-room-user');
            socket.on('set-room-username', (data) => {
                // console.log('data recieved from client', data);
                joinRoom(data.roomCode, data.userData);
            })
        })
    } else {
        console.log('Rejoining existing user', session.room, session.username);
        joinRoom(session.room, session.username);
    }

    function joinRoom(room, username) {
        socket.join(room);
        session.username = username;
        session.room = room;
        session.save();

        // console.log('session saved', session.username);
        // console.log('usersInRoom', usersInRoom, room);

        if (!usersInRoom[room]) {
            usersInRoom[room] = {};
        }
        // console.log('usersInRoom[room]', usersInRoom[room]);


        usersInRoom[room][sessionId] = {
            username,
            socketId: socket.id
        }

        // console.log('userInRoom data looks like', usersInRoom);
        const usersList = Object.values(usersInRoom[room]).map(u => u.username);
        // console.log('userList', usersList);
        io.to(room).emit('user-list', usersList);
        setupTodoEvents(socket, room, username);
    }
});

function setupTodoEvents(socket, room, username) {

    if (!todosByRoom[room]) {
        todosByRoom[room] = [];
    }

    // console.log('todosbyroom', todosByRoom);

    socket.emit('init', { todos: todosByRoom[room], username });

    socket.on('add-todos', (todo) => {
        // console.log('todo recieved from client', todo);
        todosByRoom[room].push(todo);
        // console.log('todosbyroom after adding', todosByRoom);
        io.to(room).emit('update-todos', todosByRoom[room]);
    });

    socket.on('toggle-todo', (id) => {
        todosByRoom[room] = todosByRoom[room].map(todo => todo.id === id ? { ...todo, done: !todo.done } : todo);
        // console.log('todos', todosByRoom);
        io.to(room).emit('update-todos', todosByRoom[room]);
    });

    socket.on('delete-todo', (id) => {
        todosByRoom[room] = todosByRoom[room].filter(todo => todo.id !== id);
        io.to(room).emit('update-todos', todosByRoom[room]);
    });

    socket.on('edit-todo', (todo) => {
        todosByRoom[room] = todosByRoom[room].map(t => t.id === todo.id ? { ...t, msg: todo.msg } : t);
        io.to(room).emit('update-todos', todosByRoom[room]);
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        const sessionId = socket.handshake.session.id;
        console.log(`User disconnected: ${username} (${sessionId})`);
        if (room && usersInRoom[room]) {
            delete usersInRoom[room][sessionId];
            const userList = Object.values(usersInRoom[room]).map(u => (u.username));
            io.to(room).emit('user-list', userList);
        }
    });

    socket.on('leave-room',()=>{
        const session = socket.handshake.session;
        const room = session.room;
        const sessionId = session.id;
        if(room && usersInRoom[room]){
            console.log('usersinroom', usersInRoom);
            delete usersInRoom[room][sessionId];
            console.log('usersinroom after session delete', usersInRoom);

            const userList = Object.values(usersInRoom[room]).map(u => (u.username));
            console.log('userlist', userList);
            io.to(room).emit('user-list', userList);
            if(userList.length === 0){
                delete usersInRoom[room];
                // console.log('usersinroom after room delete', usersInRoom);
            }
        }

        session.room = null;
        session.username = null;
        session.save();
        socket.leave(room);
        console.log(`User ${sessionId} left room ${room}`);
    })
}

server.listen(port, () => {
    console.log('server is running on ', `http://localhost:${port}/`);
});
