const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 游戏房间存储
const rooms = new Map();

// 静态文件服务
app.use(express.static(__dirname));

// API端点
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// 创建游戏房间
app.get('/api/create-room', (req, res) => {
  const roomId = uuidv4().slice(0, 8);
  const room = {
    id: roomId,
    players: [],
    gameBoard: Array(15).fill().map(() => Array(15).fill(0)),
    currentPlayer: 1,
    gameActive: false,
    moveHistory: [],
    gameTime: 0,
    winner: 0
  };
  
  rooms.set(roomId, room);
  res.json({ success: true, roomId, room });
});

// 获取游戏房间信息
app.get('/api/room/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  const room = rooms.get(roomId);
  
  if (room) {
    res.json({ success: true, room });
  } else {
    res.status(404).json({ success: false, message: '房间不存在' });
  }
});

// Socket.io事件处理
io.on('connection', (socket) => {
  console.log('新用户连接:', socket.id);
  
  // 加入游戏房间
  socket.on('join-room', (data) => {
    const { roomId, playerName } = data;
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }
    
    if (room.players.length >= 2) {
      socket.emit('error', { message: '房间已满' });
      return;
    }
    
    // 创建玩家对象
    const player = {
      id: socket.id,
      name: playerName || `玩家${room.players.length + 1}`,
      color: room.players.length === 0 ? 1 : 2, // 1:黑棋, 2:白棋
      isReady: false
    };
    
    // 将玩家添加到房间
    room.players.push(player);
    socket.join(roomId);
    
    // 通知房间内所有玩家
    io.to(roomId).emit('room-updated', room);
    
    // 如果房间已满，开始游戏
    if (room.players.length === 2) {
      room.gameActive = true;
      room.currentPlayer = 1; // 黑棋先行
      io.to(roomId).emit('game-start', room);
    }
    
    console.log(`玩家 ${player.name} 加入房间 ${roomId}`);
  });
  
  // 离开游戏房间
  socket.on('leave-room', (roomId) => {
    const room = rooms.get(roomId);
    if (room) {
      room.players = room.players.filter(player => player.id !== socket.id);
      socket.leave(roomId);
      
      // 如果房间为空，删除房间
      if (room.players.length === 0) {
        rooms.delete(roomId);
      } else {
        // 通知其他玩家
        room.gameActive = false;
        io.to(roomId).emit('room-updated', room);
        io.to(roomId).emit('player-left', { playerId: socket.id });
      }
      
      console.log(`玩家离开房间 ${roomId}`);
    }
  });
  
  // 落子
  socket.on('make-move', (data) => {
    const { roomId, row, col } = data;
    const room = rooms.get(roomId);
    
    if (!room || !room.gameActive) return;
    
    // 验证落子是否有效
    if (room.gameBoard[row][col] !== 0) {
      socket.emit('invalid-move', { message: '该位置已被占用' });
      return;
    }
    
    // 获取当前玩家
    const currentPlayer = room.currentPlayer;
    
    // 更新棋盘
    room.gameBoard[row][col] = currentPlayer;
    room.moveHistory.push({ row, col, player: currentPlayer });
    
    // 检查是否胜利
    const win = checkWin(room.gameBoard, row, col, currentPlayer);
    if (win) {
      room.winner = currentPlayer;
      room.gameActive = false;
      io.to(roomId).emit('game-over', { winner: currentPlayer, room });
      return;
    }
    
    // 检查是否平局
    const draw = checkDraw(room.gameBoard);
    if (draw) {
      room.gameActive = false;
      io.to(roomId).emit('game-over', { winner: 0, room });
      return;
    }
    
    // 切换玩家
    room.currentPlayer = currentPlayer === 1 ? 2 : 1;
    
    // 通知所有玩家
    io.to(roomId).emit('move-made', { row, col, player: currentPlayer, room });
  });
  
  // 游戏控制
  socket.on('game-control', (data) => {
    const { roomId, action, data: controlData } = data;
    const room = rooms.get(roomId);
    
    if (!room) return;
    
    switch (action) {
      case 'restart':
        // 重新开始游戏
        room.gameBoard = Array(15).fill().map(() => Array(15).fill(0));
        room.currentPlayer = 1;
        room.gameActive = true;
        room.moveHistory = [];
        room.gameTime = 0;
        room.winner = 0;
        io.to(roomId).emit('game-restarted', room);
        break;
        
      case 'undo':
        // 悔棋
        if (room.moveHistory.length > 0) {
          const lastMove = room.moveHistory.pop();
          room.gameBoard[lastMove.row][lastMove.col] = 0;
          room.currentPlayer = lastMove.player;
          io.to(roomId).emit('move-undo', { room });
        }
        break;
        
      case 'resign':
        // 认输
        const resignPlayer = controlData.player;
        room.winner = resignPlayer === 1 ? 2 : 1;
        room.gameActive = false;
        io.to(roomId).emit('game-over', { winner: room.winner, room });
        break;
        
      case 'exit':
        // 退出游戏
        socket.emit('exit-game', { message: '游戏已退出' });
        break;
    }
  });
  
  // 聊天消息
  socket.on('send-chat', (data) => {
    const { roomId, sender, text, timestamp } = data;
    io.to(roomId).emit('chat-message', { sender, text, timestamp });
  });
  
  // 断开连接
  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id);
    
    // 查找玩家所在的房间
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        // 移除玩家
        room.players.splice(playerIndex, 1);
        
        // 如果房间为空，删除房间
        if (room.players.length === 0) {
          rooms.delete(roomId);
        } else {
          // 通知其他玩家
          room.gameActive = false;
          io.to(roomId).emit('room-updated', room);
          io.to(roomId).emit('player-left', { playerId: socket.id });
        }
        break;
      }
    }
  });
});

// 检查胜利条件
function checkWin(board, row, col, player) {
  const directions = [
    [[-1, 0], [1, 0]], // 垂直
    [[0, -1], [0, 1]], // 水平
    [[-1, -1], [1, 1]], // 左上到右下
    [[-1, 1], [1, -1]]  // 右上到左下
  ];
  
  for (const [dir1, dir2] of directions) {
    let count = 1;
    
    // 检查两个方向
    for (const [dr, dc] of [dir1, dir2]) {
      let r = row + dr;
      let c = col + dc;
      
      while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === player) {
        count++;
        r += dr;
        c += dc;
      }
    }
    
    if (count >= 5) {
      return true;
    }
  }
  
  return false;
}

// 检查平局
function checkDraw(board) {
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      if (board[row][col] === 0) {
        return false;
      }
    }
  }
  return true;
}

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log('游戏访问地址: http://localhost:${PORT}');
});