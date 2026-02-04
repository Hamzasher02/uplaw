import 'dotenv/config'
import http from 'http'
import app from './app.js'
import connectDatabase from './db/connetion.db.js'
import initSocket from './socket/index.js'
const PORT=process.env.PORT||3000
const server = http.createServer(app)

async function start() {
    try {
        const db = await connectDatabase(process.env.MONGO_URI)
        console.log('db is connected');
        console.log('Host', db.connection.host);
        initSocket(server, app)
        console.log('socket integrated.');

        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}...`);
        })

    } catch (err) {
        console.log(err);

    }
}

start()