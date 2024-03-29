const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient
const jwt = require('jsonwebtoken')
const https = require('https');
const fs = require('fs');
const qrcode = require('qrcode')
const {WebhookClient} = require('dialogflow-fulfillment');
const {ObjectId} = require('mongodb')

const authServices = require('./auth.js')
const rservServices = require('./reserve.js')
const adminServices = require('./admin.js')
const util = require('./util.js')

const app = express();
const ADMIN = "admin@mail.com"
const requireJWTAuth = authServices.requireJWTAuth

app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json())
app.use(cors())
app.options('*', cors())
app.use(util.logRequests)
 

MongoClient.connect("mongodb://localhost:27017", { useUnifiedTopology: true },(error, client) => {
    
    if(error) throw error;
    db = client.db('IWantThisRoom');

    app.post('/login',authServices.login)
    app.post('/signup',authServices.signup)

    app.post('/timeslots',rservServices.getTimeslots)
    app.post('/reserve',[authServices.requireJWTAuth,rservServices.checkDataValidity,rservServices.checkRoom],rservServices.reserve)
    app.patch('/free',[authServices.requireJWTAuth,rservServices.checkDataValidity],rservServices.free)
    app.get('/userReservations',authServices.requireJWTAuth,rservServices.getUserReservations)
    app.get('/rooms',(req,res)=>{
        db.collection('rooms').find().toArray((err,result)=>{
            if(err) return res.status(500).send(err.toString)
            arr = []
            for(i=0;i<result.length;++i)arr.push({name: result[i]._id})
            return res.send(arr)
        })
    })
    app.get('/testQR',async (req,res)=>{
        const result = await qrcode.toDataURL('http://localhost:3000/checkReservation/5db7c69fdedea94de4927672');
        res.send(`<img src="${result}">`);
    })
    app.get('/checkReservation/:id',(req,res)=>{
        console.log(req.params.id)
        db.collection('reservations').findOne({_id:new ObjectId(req.params.id)},(err,result)=>{
            if(err) res.send(err.toString())
            console.log(result)
            res.send(result)
        })
    })
    app.get('/')

    app.get('/admin/users',[authServices.requireJWTAuth,authServices.requireAdmin],adminServices.getUsers)
    app.post('/admin/createRoom',[authServices.requireJWTAuth,authServices.requireAdmin],adminServices.createRoom)
    app.post('/admin/queryReservations',[authServices.requireJWTAuth,authServices.requireAdmin], adminServices.queryReservations)
	app.delete('/admin/deleteRoom',[authServices.requireJWTAuth,authServices.requireAdmin],adminServices.deleteRoom)
   app.listen(3000,()=>{
        console.log('listening on port 3000');
    })

    app.get('/test',(req,res)=>{
        res.send('Hello');
    })

    const timearr = 
    ['08:00 - 08:30','08:30 - 09:00','09:00 - 09:30','09:30 - 10:00','10:00 - 10:30','10:30 - 11:00','11:00 - 11:30','11:30 - 12:00','12:00 - 12:30','12:30 - 13:00','13:00 - 13:30','13:30 - 14:00','14:00 - 14:30','14:30 - 15:00','15:00 - 15:30','15:30 - 16:00','16:00 - 16:30','16:30 - 17:00','17:00 - 17:30','17:30 - 18:00']
    const generateChatRes = function(arr){
        text='available:\n'
        for(i=0;i<20;++i){
            if(!arr[i])text+=timearr[i]+'\n'
        }
        return text
    }
    app.post('/webhook',(req,res)=>{
        
        const agent = new WebhookClient({request:req,response:res})
        
        console.log('intent: ' + agent.intent);
        console.log('userID : '+ req.body.originalDetectIntentRequest.payload.data.source.userId)
        
        if(agent.intent=='hong_wang - custom - yes'){
            room = agent.context.get('hong_wang-custom-followup').parameters['hong.original']
            date = agent.context.get('hong_wang-custom-followup').parameters['date']
            date = date.substr(0,date.search('T'))
            db.collection('rooms').findOne({_id:room},(err,result)=>{
                if(err){
                    console.log(err.toString)
                    return res.status(500)
                }
                if(!result){
                    agent.handleRequest((agent)=>{
                        agent.add('Unknown room: '+room)
                    })
                }
                else{
                    a = []
                    for(i=0;i<20;++i)a.push(false)
                    db.collection('reservations').find({room:room,date:date}).toArray((err,result)=>{
                        if(err) return res.status(500).send(err.toString())
                        for(i=0;i<result.length;++i)a[result[i].slot]=true;
                        agent.handleRequest((agent)=>{
                            agent.add(generateChatRes(a))
                        })
                    })
                }
            })
           
        }
        else if(agent.intent=='hong_wang - custom'){
                agent.handleRequest((agent)=>{
                agent.context.set({'name':'hong_wang-custom-followup','lifespan':'10','parameters':agent.parameters})
                agent.add('')
            })
        }        
    })
    

    
    
});
