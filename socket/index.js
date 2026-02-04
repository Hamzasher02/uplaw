import { Server } from 'socket.io'
import cookieParser from 'cookie-parser'
import socketAuthentication from '../middleware/socketauthentication.middleware.js'
function initSocket(server, app) {
    const io = new Server(server, {
        cors: {
            origin: "http://localhost:5000",
            methods: ["POST", "GET", "PATCH", "DELETE"],
            credentials: true
        }
    })
    app.set('io', io)
    io.use((socket, next) => {
        cookieParser(process.env.COOKIE_SECRET)(socket.request, socket.request.res, (err)=>socketAuthentication(err, socket, next))
    })
    io.on('connection', (socket) => {
        console.log(socket.id, ": is connected to the server");
        // all sockets here 

    })
}

export default initSocket