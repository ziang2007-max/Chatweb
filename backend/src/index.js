const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST']
  }
});

const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Active Users Mapping (socket.id -> user info)
const activeUsers = new Map();

// Routes
app.use('/api/auth', authRoutes);

// Socket.IO
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // User registers their connection
  socket.on('register', (user) => {
    activeUsers.set(socket.id, { ...user, socketId: socket.id });
    io.emit('onlineUsers', Array.from(activeUsers.values()));
  });

  // --- WebRTC Signaling ---
  socket.on('callUser', (data) => {
    io.to(data.userToCall).emit('callUser', { 
      signal: data.signalData, 
      from: data.from, 
      name: data.name 
    });
  });

  socket.on('answerCall', (data) => {
    io.to(data.to).emit('callAccepted', data.signal);
  });

  socket.on('iceCandidate', (data) => {
    io.to(data.to).emit('iceCandidate', { 
      candidate: data.candidate, 
      from: socket.id 
    });
  });

  socket.on('endCall', (data) => {
    io.to(data.to).emit('callEnded');
  });
  // -------------------------

  // Xử lý khi user gửi tin nhắn mới
  socket.on('sendMessage', async (data) => {
    try {
      const { content, authorId, receiverId } = data;
      // Lưu tin nhắn vào DB
      const message = await prisma.message.create({
        data: {
          content,
          authorId: parseInt(authorId),
          receiverId: receiverId ? parseInt(receiverId) : null
        },
        include: {
          author: {
            select: { username: true }
          }
        }
      });
      // Phát tin nhắn mới
      if (receiverId) {
        // Send to receiver(s)
        const receivers = Array.from(activeUsers.values()).filter(u => u.id === parseInt(receiverId));
        receivers.forEach(r => io.to(r.socketId).emit('newMessage', message));
        // Send back to author
        socket.emit('newMessage', message);
      } else {
        io.emit('newMessage', message);
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    activeUsers.delete(socket.id);
    io.emit('onlineUsers', Array.from(activeUsers.values()));
  });
});

// API để lấy lịch sử tin nhắn
app.get('/api/messages', async (req, res) => {
  try {
    const { userId, receiverId } = req.query;
    
    let whereClause = { receiverId: null }; // Default to global chat
    
    if (userId && receiverId) {
      whereClause = {
        OR: [
          { authorId: parseInt(userId), receiverId: parseInt(receiverId) },
          { authorId: parseInt(receiverId), receiverId: parseInt(userId) }
        ]
      };
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        author: {
          select: { username: true }
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 100 // Lấy 100 tin nhắn gần nhất
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
