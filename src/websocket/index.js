/*
 * @Author: 大明冯 
 * @Date: 2018-09-05 20:08:24 
 * @Last Modified by: 大明冯
 * @Last Modified time: 2018-09-28 16:06:44
 */

import WebSocket from 'ws';
import Robot from './robot';
import axios from 'axios';
import config from './../config'
import {resourceController} from './../controller'

export default (server) => {
  const wss = new WebSocket.Server({server});
  wss.room = [];
  wss.on('connection', (ws, req) => {
    ws.on('message',  (res) => {
      let data = JSON.parse(res);
      handleMsg(data)
    });

    ws.on('close', (res) => {
      leaveGame()
    })

    ws.on('error', (err) => {
      console.error(err)
    })

    function handleMsg(obj) {
      switch (obj.code) {
        case 0:
          joinGame(obj)
          break;
        case 1:
          obj.code = 2
          broadcast(obj)
          break;
        case 2:
          leaveGame(obj)
          break;
        case 3: 
          withRobot(obj)
          break;
        case 4:
          leaveGame(obj)
          break;
        default:
          joinGame(obj)
      }
    }

    function joinGame(obj) {
      let waiting_user = global.waiting_user;
      let client = {client: ws}
      delete obj.code;
      delete obj.msg;
      
      if (validateJoinGame(obj.client)) {
        console.log('oready join game')
        return false;
      }
      
      if (waiting_user && waiting_user.length) {
        const prev_game_user = waiting_user.shift();
        const houseId = prev_game_user.houseId;

        client.user = obj.client;
        client.houseId = houseId;

        waitJoinMsg(ws, houseId)

        savePlayingClient(prev_game_user)
        savePlayingClient(client)

        const gamer = [
          prev_game_user.user,
          obj.client
        ]
        loadResource(houseId).then(res => {
          startGameMsg(houseId, gamer, res)
        })
      } else {
        //新加入成员
        const houseId = (new Date()).getTime();
        client.user = obj.client;
        client.houseId = houseId;
        saveWaitingClient(client)

        waitJoinMsg(ws, houseId)
      }
    }

    function waitJoinMsg(client, houseId) {
      const obj = {
        code: 0,
        houseId,
        msg: 'waitting others join.',
      }
      client.send(JSON.stringify(obj))
    }

    function startGameMsg(houseId, gamer, resource){
      const obj = {
        code: 1,
        houseId,
        resource: resource,
        gamer,
        timer: (new Date()).getTime(),
        msg: 'loading game resource.'
      }
      broadcast(obj)
    }

    function gameOverMsg(client) {
      const obj = {
        code: 3,
        msg: 'The opponent leaves the game!',
      }
      client.send(JSON.stringify(obj))
    }

    function leaveGame() {
      getGlobalUser()
      let playing_user = global.playing_user;
      let houseId = 0;
      
      for(var i=0,len=playing_user.length; i < len; i++) {
        const item  = playing_user[i];
        if(item.client == ws) {
          houseId = item.houseId;
          global.playing_user.splice(i, 1)
          break;
        }
      }
      if(houseId) {
        playing_user = global.playing_user;
        for (const index in playing_user) {
          const client = playing_user[index];
          if (client.houseId == houseId) {
            if (client.client) {
              saveWaitingClient(client)
              gameOverMsg(client.client)
            }
            global.playing_user.splice(index, 1)
          }
        }
      } else {
        let waiting_user = global.waiting_user;
        for(const index in waiting_user) {
          const client = waiting_user[index];
          if(client.client == ws) {
            global.waiting_user.splice(index, 1)
          }
        }
      }
    }

    function broadcast(obj){
      let gamer = '';
      global.playing_user.map((item, index) => {
        if (item.houseId == obj.houseId) {
          if (item.client) {
            gamer = item.client
            if (ws.readyState < 2) {
              gamer.send(JSON.stringify(obj))
            }
          } else {
            const currentTime = (new Date()).getTime();
            let prevTime = item.prevTime || 0;
            let time = item.time || 0;
            let timer = currentTime - prevTime - time;
            if (timer >= 0) {
              timer = 0
            } else {
              timer = timer * -1
            }
            setTimeout(() => {
              const newRobot = robotMsg(obj.code, gamer, item)
              if (newRobot) {
                global.playing_user.splice(index, 1, newRobot)
              }
            }, timer)
          }
        }
      })
    }
    
    function validateJoinGame(user){
      let playing_user = global.playing_user;
      if (!playing_user || !playing_user.length) {
        return false;
      }
      const isPlaying = playing_user.some(item => {
        return item.client === ws && user.userId == item.user.userId
      })
      const isWaiting = global.waiting_user.some(item => {
        return item.client === ws && user.userId == item.user.userId
      })

      return isPlaying || isWaiting
    }

    function saveWaitingClient(client) {
      getGlobalUser()
      global.waiting_user.push(client)
    }

    function savePlayingClient(client) {
      getGlobalUser()
      global.playing_user.push(client)
    }

    function getGlobalUser() {
      if (!global.waiting_user) {
        global.waiting_user = [];
      }
      if (!global.playing_user) {
        global.playing_user = [];
      }
    }

    function loadResource(houseId) {
      const path = `${config.resource}/game/resource`
      console.log(`resource api : ${path}`)
      return axios.get(path, {
          params: {
            houseId
          }
        }).then(res => {
        return res.data
      }).then(res => {
        console.log(`res: ${JSON.stringify(res)}`)
        if (res.errcode) {
          // return loadResource(houseId)
          return false
        }
        return res.data
      }).catch(err => {
        return err.Error
      })
    }

    function withRobot(obj) {
      const robot = new Robot();
      let waiting_user = global.waiting_user;
      console.log('playing with: '+ obj.userId)
      for (const index in waiting_user) {
        const client = waiting_user[index];
        if (client.client == ws) {
          global.waiting_user.splice(index, 1);
          
          const houseId = client.houseId
          savePlayingClient(client)
          savePlayingClient({
            user: robot.client,
            houseId,
            client: null,
            answers: robot.answers()
          })
          const gamer = [
            robot.client,
            client.user
          ]

          loadResource(houseId).then(res => {
            // console.log(`resource: ${JSON.stringify(res)}`)
            startGameMsg(houseId, gamer, res)
          })
        }
      }
    }

    function robotMsg(code, gamer, robot) {
      const obj = {
        code: 2,
        houseId: robot.houseId,
        userId: robot.user.userId,
        timer: (new Date()).getTime(),
        msg: 'the message from robot'
      }
      if(!robot.answers.length) {
        return false;
      }
      const answer = robot.answers.shift();
      robot.time = robot.time || 0;
      let time = answer.useTime + 3000;
      const useTime = answer.useTime + robot.time
      setTimeout(() => {
        Object.assign(answer, {useTime})
        obj.answer = answer;
        if (ws.readyState < 2) {
          gamer.send(JSON.stringify(obj))
        }
      }, time)
      robot.prevTime = (new Date()).getTime();
      robot.useTime = useTime;
      robot.time = time
      return robot
    }
  });
} 

