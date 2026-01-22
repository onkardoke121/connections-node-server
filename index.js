const { Server } = require("socket.io");

const io = new Server(3000, {
  cors: {
    origin: "*",
  },
});

console.log("Signaling Server running on port 3000");

// Map roomID -> Set<socketId>
const rooms = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    // Basic room logic
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    
    const room = rooms.get(roomId);
    
    // Limit to 2 users per room for "OnlyUs"
    if (room.size >= 2) {
      socket.emit("room-full");
      return;
    }

    room.add(socket.id);
    socket.join(roomId);
    socket.roomId = roomId;

    console.log(`Socket ${socket.id} joined room ${roomId}. Size: ${room.size}`);

    // If room has 2 people, notify them found
    if (room.size === 2) {
      io.to(roomId).emit("partner-found");
    }
  });

  // Signaling Data Forwarding
  // Payload: { target: socketId, type: 'offer'|'answer'|'candidate'|'key', data: ... }
  socket.on("signal", (payload) => {
    // Broadcast to others in room (should act as p2p signal)
    // To keep it simple for 2 people, just broadcast to room excluding sender
    socket.to(socket.roomId).emit("signal", payload);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (socket.roomId && rooms.has(socket.roomId)) {
      const room = rooms.get(socket.roomId);
      room.delete(socket.id);
      
      // Notify partner
      socket.to(socket.roomId).emit("partner-left");
      
      if (room.size === 0) {
        rooms.delete(socket.roomId);
      }
    }
  });
});
