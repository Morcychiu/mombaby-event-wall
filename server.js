const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const qrcode = require('qrcode');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 儲存所有留言 (記憶體)
let notes = [];

// 取得大螢幕頁面
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'screen.html'));
});

// 取得手機輸入頁面
app.get('/mobile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mobile.html'));
});

// 產生動態 QR Code API
app.get('/api/qrcode', async (req, res) => {
    try {
        const host = req.headers.host;
        const protocol = req.protocol;
        const mobileUrl = `${protocol}://${host}/mobile`;
        const qrDataUrl = await qrcode.toDataURL(mobileUrl, { margin: 1, width: 250 });
        res.json({ qrCodeUrl: qrDataUrl, mobileUrl });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate QR Code' });
    }
});

// Socket.io 即時連線邏輯
io.on('connection', (socket) => {
    console.log('⚡ 新裝置連線:', socket.id);

    // 一連線就發送既有留言
    socket.emit('init-notes', notes);

    // 收到手機端發送的新留言
    socket.on('send-note', (data) => {
        const noteData = {
            text: data.text,
            color: data.color || 'bg-amber-100/95 border-amber-300 text-amber-950',
            x: Math.floor(Math.random() * 65) + 15,
            y: Math.floor(Math.random() * 40) + 20,
            rot: (Math.random() * 14 - 7).toFixed(1)
        };
        notes.push(noteData);
        
        // 廣播給所有大螢幕與用戶
        io.emit('new-note', noteData);
    });

    // 清空留言
    socket.on('clear-notes', () => {
        notes = [];
        io.emit('clear-notes');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 伺服器已啟動：http://localhost:${PORT}`);
    console.log(`📱 手機留言網址：http://localhost:${PORT}/mobile`);
});
