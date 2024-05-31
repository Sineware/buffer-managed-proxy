/*  Sineware TCP Buffer Managed Proxy
 *
 *  Copyright (C) 2024 Seshan Ravikumar

 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as
 *  published by the Free Software Foundation, either version 3 of the
 *  License, or (at your option) any later version.

 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.

 *  You should have received a copy of the GNU Affero General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
// Based on https://gist.github.com/kfox/2313683

const net = require("net");

process.on("uncaughtException", function (error) {
    console.error(error);
});

const localport = process.env.LOCAL_PORT;
const remotehost = process.env.REMOTE_HOST;
const remoteport = process.env.REMOTE_PORT;

if (!localport || !remotehost || !remoteport) {
    console.error("Usage: LOCAL_PORT=1234 REMOTE_HOST=example.com REMOTE_PORT=1234 node index.js");
    process.exit(1);
}

let connections = 0;

/* Proxy Server */
const server = net.createServer((localsocket) => {
    const cId = connections;
    connections++;

    const log = (msg) => {
        console.log(`[${(new Date()).toLocaleString()}] [ID #${cId}] ${msg}`);
    }

    const remotesocket = new net.Socket();
    remotesocket.connect(remoteport, remotehost);
    log(`>>> connection #${cId} from ${localsocket.remoteAddress}:${localsocket.remotePort}`);
    remotesocket.on('connect', () => { log(`>>> upstream connection for #${cId} established.`); });

    /* Data Streaming */
    localsocket.on('data', (data) => {
        const flushed = remotesocket.write(data);
        if (!flushed) {
            log("-> remote not flushed; pausing local");
            localsocket.pause();
        }
    });
    remotesocket.on('data', (data) => {
        const flushed = localsocket.write(data);
        if (!flushed) {
            log("-> local not flushed; pausing remote");
            remotesocket.pause();
        }
    });

    /* Buffer Handling */
    localsocket.on('drain', () => {
        log(` --> ${localsocket.remoteAddress}:${localsocket.remotePort} - local drained, resuming remote`);
        remotesocket.resume();
    });
    remotesocket.on('drain', () => {
        log(` --> ${localsocket.remoteAddress}:${localsocket.remotePort} - remote drained, resuming local`);
        localsocket.resume();
    });

    /* Connection Finished */
    localsocket.on('close', (had_error) => {
        log(`[End] ${localsocket.remoteAddress}:${localsocket.remotePort} - closing remote from local close, error ${had_error}`);
        remotesocket.end();
    });

    remotesocket.on('close', (had_error) => {
        log(`[End] ${localsocket.remoteAddress}:${localsocket.remotePort} - closing local from remote close, error ${had_error}`);
        localsocket.end();
    });
});


server.listen(localport);
console.log("Redirecting connections from 0.0.0.0:%d to %s:%d", localport, remotehost, remoteport);