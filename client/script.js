// 本地游戏模式
let gameId = null;
let currentPlayer = 'black'; // 'black' 或 'white'
let gameBoard = Array(15).fill().map(() => Array(15).fill(null));
let gameActive = false;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('createGame').addEventListener('click', createLocalGame);
    document.getElementById('joinGame').addEventListener('click', joinLocalGame);
});

// 创建本地游戏
function createLocalGame() {
    gameId = 'local-game-' + Date.now();
    gameBoard = Array(15).fill().map(() => Array(15).fill(null));
    currentPlayer = 'black';
    gameActive = true;
    initBoard();
    alert(`本地游戏已创建！`);
}

// 加入本地游戏（简单模拟）
function joinLocalGame() {
    const inputGameId = document.getElementById('gameIdInput').value;
    if (inputGameId.startsWith('local-game-')) {
        gameId = inputGameId;
        gameBoard = Array(15).fill().map(() => Array(15).fill(null));
        currentPlayer = 'white';
        gameActive = true;
        initBoard();
        alert(`成功加入本地游戏！`);
    } else {
        alert('无效的游戏ID，请输入以 local-game- 开头的游戏ID');
    }
}

// 初始化棋盘
function initBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    
    // 为棋盘添加样式
    boardElement.style.display = 'grid';
    boardElement.style.gridTemplateColumns = 'repeat(15, 30px)';
    boardElement.style.gridTemplateRows = 'repeat(15, 30px)';
    boardElement.style.gap = '0px';
    boardElement.style.border = '2px solid #333';
    boardElement.style.margin = '20px auto';
    
    gameBoard.forEach((row, x) => {
        row.forEach((cell, y) => {
            const cellElement = document.createElement('div');
            cellElement.classList.add('cell');
            cellElement.dataset.x = x;
            cellElement.dataset.y = y;
            
            // 为单元格添加样式
            cellElement.style.width = '30px';
            cellElement.style.height = '30px';
            cellElement.style.border = '1px solid #ccc';
            cellElement.style.display = 'flex';
            cellElement.style.alignItems = 'center';
            cellElement.style.justifyContent = 'center';
            cellElement.style.cursor = 'pointer';
            
            // 如果单元格已有棋子，显示棋子
            if (cell) {
                const stoneElement = document.createElement('div');
                stoneElement.classList.add('stone');
                stoneElement.classList.add(cell);
                // 为棋子添加样式
                stoneElement.style.width = '26px';
                stoneElement.style.height = '26px';
                stoneElement.style.borderRadius = '50%';
                stoneElement.style.backgroundColor = cell === 'black' ? '#000' : '#fff';
                stoneElement.style.border = '1px solid #333';
                cellElement.appendChild(stoneElement);
            }
            
            // 添加点击事件
            cellElement.addEventListener('click', () => {
                if (gameActive && !cell) {
                    makeLocalMove(x, y);
                }
            });
            
            boardElement.appendChild(cellElement);
        });
    });
}

// 落子
function makeLocalMove(x, y) {
    // 更新棋盘
    gameBoard[x][y] = currentPlayer;
    
    // 检查胜利
    const winner = checkWinner(gameBoard, x, y);
    if (winner) {
        initBoard(); // 更新棋盘显示
        alert(`游戏结束，胜利者是：${winner}`);
        gameActive = false;
        return;
    }
    
    // 检查平局
    if (checkDraw(gameBoard)) {
        initBoard(); // 更新棋盘显示
        alert(`游戏结束，平局！`);
        gameActive = false;
        return;
    }
    
    // 切换玩家
    currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
    
    // 更新棋盘显示
    initBoard();
}

// 检查胜利条件
function checkWinner(board, x, y) {
    const player = board[x][y];
    const directions = [
        [{dx: 0, dy: 1}, {dx: 0, dy: -1}],   // 水平
        [{dx: 1, dy: 0}, {dx: -1, dy: 0}],   // 垂直
        [{dx: 1, dy: 1}, {dx: -1, dy: -1}],  // 对角线（右下到左上）
        [{dx: 1, dy: -1}, {dx: -1, dy: 1}]   // 对角线（右上到左下）
    ];
    
    for (const [dir1, dir2] of directions) {
        let count = 1;
        
        // 检查第一个方向
        for (let i = 1; i <= 4; i++) {
            const nx = x + dir1.dx * i;
            const ny = y + dir1.dy * i;
            if (nx >= 0 && nx < 15 && ny >= 0 && ny < 15 && board[nx][ny] === player) {
                count++;
            } else {
                break;
            }
        }
        
        // 检查第二个方向
        for (let i = 1; i <= 4; i++) {
            const nx = x + dir2.dx * i;
            const ny = y + dir2.dy * i;
            if (nx >= 0 && nx < 15 && ny >= 0 && ny < 15 && board[nx][ny] === player) {
                count++;
            } else {
                break;
            }
        }
        
        if (count >= 5) {
            return player;
        }
    }
    
    return null;
}

// 检查平局
function checkDraw(board) {
    for (let x = 0; x < 15; x++) {
        for (let y = 0; y < 15; y++) {
            if (board[x][y] === null) {
                return false;
            }
        }
    }
    return true;
}
