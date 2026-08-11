import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';

async function startServer() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server);
  const PORT = 3000;

  // Real-time matching logic
  let onlineCount = 0;
  // Queue for each room size
  const queues = {
    2: [] as any[],
    3: [] as any[],
    4: [] as any[],
  };
  
  // Track active rooms
  const rooms = new Map<string, any[]>();

  io.on('connection', (socket) => {
    onlineCount++;
    io.emit('online_count', onlineCount);

    let currentRoomId: string | null = null;
    let currentUserProfile: any = null;

    socket.on('join_queue', (data: { size: 2 | 3 | 4, profile: any }) => {
      const { size, profile } = data;
      currentUserProfile = profile;
      const user = { socket, profile, isBot: false };
      
      if (queues[size]) {
        queues[size].push(user);
        
        const broadcastQueue = () => {
          const queueProfiles = queues[size].map(u => u.profile);
          queues[size].forEach(u => {
            if (!u.isBot) {
              u.socket.emit('queue_update', { current: queues[size].length, target: size, users: queueProfiles });
            }
          });
        };
        
        broadcastQueue();

        const checkRoom = () => {
          if (queues[size].length >= size) {
            const matchedUsers = queues[size].splice(0, size);
            const roomId = Math.random().toString(36).substring(2, 9);
            const roomProfiles = matchedUsers.map(u => u.profile);
            
            rooms.set(roomId, matchedUsers);

            matchedUsers.forEach((u) => {
              if (!u.isBot) {
                u.socket.join(roomId);
                u.socket.emit('room_ready', { roomId, users: roomProfiles });
              }
            });
          }
        };
        
        checkRoom();
      }
    });

    socket.on('leave_queue', (data: { size: 2 | 3 | 4 }) => {
      if (queues[data.size]) {
        queues[data.size] = queues[data.size].filter(u => u.socket.id !== socket.id);
        const queueProfiles = queues[data.size].map(u => u.profile);
        queues[data.size].forEach(u => {
          u.socket.emit('queue_update', { current: queues[data.size].length, target: data.size, users: queueProfiles });
        });
      }
    });

    socket.on('join_room', (roomId: string) => {
      currentRoomId = roomId;
    });

    socket.on('update_profile', (profile: any) => {
      currentUserProfile = profile;
      if (currentRoomId && rooms.has(currentRoomId)) {
        const roomUsers = rooms.get(currentRoomId)!;
        const user = roomUsers.find(u => u.socket.id === socket.id);
        if (user) {
          user.profile = profile;
          const roomProfiles = roomUsers.map(u => u.profile);
          io.to(currentRoomId).emit('room_update', roomProfiles);
        }
      }
    });

    socket.on('chat_message', (msg) => {
      if (currentRoomId) {
        io.to(currentRoomId).emit('chat_message', msg);
      }
    });

    socket.on('webrtc_signal', (data: { targetUserId: string, signal: any }) => {
      if (currentRoomId && rooms.has(currentRoomId)) {
        const roomUsers = rooms.get(currentRoomId)!;
        const targetUser = roomUsers.find(u => u.profile.id === data.targetUserId);
        if (targetUser && !targetUser.isBot) {
          targetUser.socket.emit('webrtc_signal', {
            fromUserId: currentUserProfile.id,
            signal: data.signal
          });
        }
      }
    });

    socket.on('leave_room', () => {
      if (currentRoomId && rooms.has(currentRoomId)) {
        socket.leave(currentRoomId);
        let roomUsers = rooms.get(currentRoomId)!;
        roomUsers = roomUsers.filter(u => u.socket.id !== socket.id);
        
        if (roomUsers.length === 0) {
          rooms.delete(currentRoomId);
        } else {
          rooms.set(currentRoomId, roomUsers);
          const roomProfiles = roomUsers.map(u => u.profile);
          io.to(currentRoomId).emit('room_update', roomProfiles);
        }
        currentRoomId = null;
      }
    });

    socket.on('disconnect', () => {
      onlineCount--;
      io.emit('online_count', onlineCount);
      
      // Remove from any queue
      [2, 3, 4].forEach(size => {
        if (queues[size as 2|3|4]) {
          const oldLen = queues[size as 2|3|4].length;
          queues[size as 2|3|4] = queues[size as 2|3|4].filter(u => u.socket.id !== socket.id);
          if (queues[size as 2|3|4].length !== oldLen) {
            const queueProfiles = queues[size as 2|3|4].map(u => u.profile);
            queues[size as 2|3|4].forEach(u => {
              u.socket.emit('queue_update', { current: queues[size as 2|3|4].length, target: size, users: queueProfiles });
            });
          }
        }
      });

      // Remove from room
      if (currentRoomId && rooms.has(currentRoomId)) {
        let roomUsers = rooms.get(currentRoomId)!;
        roomUsers = roomUsers.filter(u => u.socket.id !== socket.id);
        
        if (roomUsers.length === 0) {
          rooms.delete(currentRoomId);
        } else {
          rooms.set(currentRoomId, roomUsers);
          const roomProfiles = roomUsers.map(u => u.profile);
          io.to(currentRoomId).emit('room_update', roomProfiles);
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
