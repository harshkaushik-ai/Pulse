import { io } from 'socket.io-client';

const socket = io(
  import.meta.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000',
  { transports: ['websocket'], reconnection: true, reconnectionDelay: 2000 }
);
console.log("socket",socket)
socket.on('connect', () => {
  console.log('WebSocket connected:', socket.id);
});
export default socket;