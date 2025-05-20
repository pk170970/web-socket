const socket = io();
const loading = document.querySelector('.spinner');
const inputTodo = document.querySelector('.todo-input');
const list = document.getElementById('todo-list');
const usernameContainer = document.getElementById('username-display');
const userAvatars = document.getElementById('user-avatars');
const addBtn = document.querySelector('.addBtn');
const startBtn = document.querySelector('.start');
const stopBtn = document.querySelector('.stop');

startBtn.addEventListener('click',()=>{
    socket.emit('start-app');
});

stopBtn.addEventListener('click',()=>{
    socket.emit('leave-room');
    window.location.reload();
})

socket.on('connect', () => {
    console.log('🔌 Connected to server');
    loading.style.display='none';
});

socket.on('update-todos', (todos)=>{
    console.log('todos', todos);
    renderTodos(todos);
});

socket.on('request-room-user',()=>{
    const userData = prompt('Please enter the username');
    const roomCode = prompt('Enter your room code:');
    if(!userData && !roomCode){
        alert('Username and room are required!');
        return;
    }
    socket.emit('set-room-username', {roomCode, userData});
});

socket.on('init', (data)=>{
    loading.style.display = 'none';
    inputTodo.style.display = 'inline-block';
    list.style.display = 'block';
    addBtn.style.display = 'inline-block';
    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    console.log('data on init', data);
    // username.textContent = data.username;
    renderTodos(data.todos);
});

socket.on('user-list',(users)=>{
    userAvatars.innerHTML = '';
    usernameContainer.innerHTML = '';
    users.forEach(user=>{
        const avatar = document.createElement('div');
        avatar.textContent = user[0];
        avatar.classList.add('avatar');

        const userName = document.createElement('p');
        userName.textContent = user;
        userAvatars.appendChild(avatar);
        usernameContainer.appendChild(userName);
    })
})

function addTodo(){
    const todo = inputTodo.value;
    if(!todo){
        alert('Please enter the todo!');
        return;
    }
    socket.emit('add-todos',{id: Date.now(), msg:todo, done: false});
    inputTodo.value = '';
}

function toggleTodo(id){
    socket.emit('toggle-todo',id);
}

function deleteTodo(id){
    socket.emit('delete-todo',id);
}

function editTodo(todo,li){
    const input = document.createElement('input');
    input.classList.add('todo-input');
    input.style.display='inline-block';
    const cleaned = li.textContent.replace(/[^\w\s]/gi, '');
    input.value = cleaned;
    li.innerHTML = '';

    const editBtn = document.createElement('button');
    editBtn.textContent = "✅";
    editBtn.onclick = ()=>{
        socket.emit('edit-todo', {id: todo.id, msg: input.value, done: todo.done});
    }
    li.appendChild(input);
    li.appendChild(editBtn);
} 


function renderTodos(todos){
    console.log('todos came from backend', todos);
    list.innerHTML = '';
    todos.forEach(todo => {
        const li = document.createElement('li');
        const span = document.createElement('span');
        const {id, msg, done} = todo;
        span.textContent = msg;
        if(done) span.classList.add('done');
        span.onclick = ()=> toggleTodo(id);

        const delBtn = document.createElement('button');
        delBtn.textContent = "🗑️";
        delBtn.onclick = () => deleteTodo(id);

        const editBtn = document.createElement('button');
        editBtn.textContent = "✏️";
        editBtn.style.marginLeft = "auto";
        editBtn.onclick = ()=> editTodo(todo,li);

        li.appendChild(span);
        li.appendChild(editBtn);
        li.appendChild(delBtn);
        list.appendChild(li);
    });
}
