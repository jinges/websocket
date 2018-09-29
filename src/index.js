/*
 * @Author: 大明冯 
 * @Date: 2018-08-30 16:14:49 
 * @Last Modified by: 大明冯
 * @Last Modified time: 2018-09-26 11:22:55
 */

import 'babel-core/register';
import 'babel-polyfill';
import Koa from 'koa';
import https from 'https';
import fs from 'fs';
import path from 'path';
import koaStatic from 'koa-static';
import config from './config'
// import socket from './socket.io';
import router from './route';
import middleware from './middleware';
import websocket from './websocket';

const app = new Koa();


middleware(app)

app.use(koaStatic(path.join(__dirname, '../website')))

router(app)


const server = new https.createServer({
    cert: fs.readFileSync('./keys/cert.pem'),
    key: fs.readFileSync('./keys/key.pem')
}, app.callback()).listen(config.port, () => console.info(`The server is running at http://localhost:${config.port}/`));



websocket(server)


// socket(app)
// app.listen(config.port, () => console.info(`The server is running at http://localhost:${config.port}/`));