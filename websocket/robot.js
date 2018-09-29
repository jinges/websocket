/*
 * @Author: 大明冯 
 * @Date: 2018-09-17 14:38:16 
 * @Last Modified by: 大明冯
 * @Last Modified time: 2018-09-18 12:16:42
 */
import randomNum from './../common/random'

class Robot{
  constructor(){
    this.client = {
      userId: 'U' + (new Date()).getTime(),
      name: '外星使者',
      avatar: 'https://m.teacher.jiaofuyun.com/studentPK/images/weapp/et.png',
      robot: true,
    }
  }

  answers() {
    let answers = [];
    for(let i=0; i< 5; i++) {
      const answer = {
        useTime: randomNum(1, 6000, 1000),
        isRight: -1,
        chooseIndex: randomNum(1, 4),
        index: i
      }
      answers.push(answer)
    }
    return answers;
  }
}

export default Robot;