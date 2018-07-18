#!/usr/bin/env node
const program = require('commander');
const generator = require('../lib/generator');
const path = require('path');
const fs = require('fs');
const glob = require('glob'); // npm i glob -D
const chalk = require('chalk');
const logSymbols = require('log-symbols');
const latestVersion = require('latest-version');  //  这个模块可以获取node包的最新版本
const inquirer = require('inquirer');
const download = require('../lib/download');
program.usage('<project-name>').parse(process.argv);
// 根据输入，获取项目名称
let projectName = program.args[0];
if (!projectName) {  // project-name 必填
// 相当于执行命令的--help选项，显示help信息，这是commander内置的一个命令选项
    // program.help() 
    console.error(logSymbols.error, chalk.red(`请输入项目目录名称 npm run init <project-name>`))
    return
}
const list = glob.sync('*')  // 遍历当前目录
let next = undefined;
console.log("list",list)
let rootName = path.basename(process.cwd())//当前目录名称(当前脚本的工作目录的路径)
let localTpl = path.join(process.cwd(), "tpl");
console.log("localTpl",localTpl)
let length = list.length,promiseArr = [];
console.log('rootName',rootName)
if (length) {  // 如果当前目录不为空
    for(let i = 0; i < length; i++){
        promiseArr[promiseArr.length] = function (){
            return new Promise((resolve,reject)=>{
                 const fileName = path.resolve(process.cwd(), path.join('.', list[i]));
                 fs.stat(fileName,(err,stats)=>{
                     isDir = stats.isDirectory();
                     if(err){
                         reject();
                     }else{
                         resolve({
                             stats:isDir,
                             fileName:list[i]
                         });
                     }
                 })
             })
         }
    }
}
console.log('promiseArr',promiseArr)
Promise.all(promiseArr.map(item=>{
    if(Object.prototype.toString.call(item)  === "[object Function]"){
        return item();
    }
})).then(function(result) {
    return new Promise((resolve,reject)=>{
        console.log('result',result)
        if(Object.prototype.toString.call(result)  === "[object Array]" ){
            if(result.filter(resultObj=>{
                if(resultObj && resultObj.stats == true && resultObj.fileName == projectName){
                    return true;
                }
                return false;
            }).length > 0){
                console.error(logSymbols.error, chalk.red(`创建失败：项目${projectName}已经存在`))
            }else if(rootName === projectName){
                next = inquirer.prompt([
                    {
                        name: 'buildInCurrent',
                        message: '当前目录为空，且目录名称和项目名称相同，是否直接在当前目录下创建新项目？',
                        type: 'confirm',
                        default: true
                    }
                ]).then(answer => {
                    console.log("answer",answer)
                    next =  Promise.resolve(answer.buildInCurrent ? '.' : projectName)
                    resolve(answer);
                })
            }else{
                next = Promise.resolve(projectName);
                resolve();
            }
        }
    })
}).then(result=>{
    next && go(result);
})
function go (result) {
    next.then(projectRoot => {
        if (projectRoot !== '.') {
            fs.mkdirSync(projectRoot)
        }
        return inquirer.prompt([
                {
                    name: 'projectName',
                    message: '项目的名称',
                    default: projectName
                }, {
                    name: 'projectAuthor',
                    message: '项目的作者',
                    default: 'anonymous'
                },{
                    name: 'projectVersion',
                    message: '项目的版本号',
                    default: '1.0.0'
                }, {
                    name: 'projectDescription',
                    message: '项目的简介',
                    default: `A project named ${projectName}`
                }
            ]).then(answers => {
                return latestVersion('macaw-ui').then(version => {
                    answers.supportUiVersion = version
                    return download(projectRoot).then(target => {
                        console.log("target",target)
                        result = result || {};
                        return {
                            result,
                            metadata: {
                              answers,
                              projectName
                            }
                        }
                    }).then(context => {
                        console.log("context",context)
                        // 添加生成的逻辑
                        return generator(context.metadata,localTpl,projectRoot).then(result => {
                            console.log("context",result)
                            console.log(logSymbols.success, chalk.green('创建成功:)'))
                            console.log(chalk.green('cd ' + context.metadata.answers.projectName + '\nnpm install\nnpm run dev'))
                        }).catch(err => {
                            console.error(logSymbols.error, chalk.red(`创建失败：${err.message}`))
                        }) 
                    }).catch(err =>console.log(err))
                })
            })
    })
}