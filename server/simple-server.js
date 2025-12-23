const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    console.log(`Request: ${req.url}`);
    
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 处理OPTIONS请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // 静态文件服务
    // 忽略查询参数
    let cleanUrl = req.url.split('?')[0];
    let filePath;
    
    if (cleanUrl === '/') {
        // 根路径请求index.html
        filePath = path.join(__dirname, '../client/index.html');
    } else {
        // 其他请求，直接映射到client目录
        filePath = path.join(__dirname, '../client', cleanUrl);
    }
    
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm'
    }[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                // 文件不存在
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                // 服务器错误
                res.writeHead(500);
                res.end('500 Internal Server Error');
            }
        } else {
            // 文件存在，返回文件内容
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// 启动服务器
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});

// 简单的游戏状态管理
let games = {};

// 模拟Socket.io的简单实现
// 注意：这是一个简化的实现，实际应用中应该使用Socket.io库
console.log('简单服务器已启动，支持静态文件服务');
console.log('注意：此服务器仅提供静态文件服务，不支持Socket.io功能');
console.log('如果需要完整的Socket.io功能，请安装依赖并运行原始的server.js');
