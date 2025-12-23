const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('client'));

let games = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('createGame', () => {
        const gameId = uuidv4();
        games[gameId] = { board: Array(15).fill().map(() => Array(15).fill(null)), players: [], currentPlayer: null };
        socket.join(gameId);
        socket.emit('gameCreated', gameId);
        console.log(`Game created: ${gameId}`);
    });

    socket.on('joinGame', (gameId) => {
        if (games[gameId]) {
            socket.join(gameId);
            games[gameId].players.push(socket.id);
            if (games[gameId].players.length === 2) {
                games[gameId].currentPlayer = games[gameId].players[0];
                io.to(gameId).emit('startGame', games[gameId].board);
            }
            socket.emit('gameJoined', gameId);
            console.log(`User joined game: ${gameId}`);
        } else {
            socket.emit('error', 'Game not found');
        }
    });

    socket.on('makeMove', (gameId, x, y) => {
        const game = games[gameId];
        if (game && game.board[x][y] === null) {
            game.board[x][y] = game.currentPlayer;
            const winner = checkWinner(game.board, x, y);
            io.to(gameId).emit('updateBoard', game.board, winner);
            game.currentPlayer = game.players.find(player => player !== game.currentPlayer);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

function checkWinner(board, x, y) {
    // 检查胜利条件（省略具体实现）
    return null; // 返回胜利者或 null
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});