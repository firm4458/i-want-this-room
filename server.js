const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient
const jwt = require('jsonwebtoken')
const https = require('https');
const fs = require('fs');
const {WebhookClient} = require('dialogflow-fulfillment');

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

    app.post('/timeslots',rservServices.getTimeslots)
    app.post('/reserve',[authServices.requireJWTAuth,rservServices.checkDataValidity,rservServices.checkRoom],rservServices.reserve)
    app.patch('/free',[authServices.requireJWTAuth,rservServices.checkDataValidity],rservServices.free)
    app.get('/userReservations',authServices.requireJWTAuth,rservServices.getUserReservations)

    app.get('/admin/users',[authServices.requireJWTAuth,authServices.requireAdmin],adminServices.getUsers)
    app.post('/admin/createRoom',[authServices.requireJWTAuth,authServices.requireAdmin],adminServices.createRoom)
    app.post('/admin/queryReservations',[authServices.requireJWTAuth,authServices.requireAdmin], adminServices.queryReservations)
	
   app.listen(3000,()=>{
        console.log('listening on port 3000');
    })

    app.get('/test',(req,res)=>{
        res.send('Hello');
    })

    const convertMiddleWare = function(req,res,next){
        req.agent = new WebhookClient({
            request: req,
            response: res
        });
        req.body = [{room: req.agent.parameters['hong']}]
        next()
    }
    const timearr = 
    ['08:00 - 08:30','08:30 - 09:00','09:00 - 09:30','09:30 - 10:00','10:00 - 10:30','10:30 - 11:00','11:00 - 11:30','11:30 - 12:00','12:00 - 12:30','12:30 - 13:00','13:00 - 13:30','13:30 - 14:00','14:00 - 14:30','14:30 - 15:00','15:00 - 15:30','15:30 - 16:00','16:00 - 16:30','16:30 - 17:00','17:00 - 17:30','17:30 - 18:00']
    const generateChatRes = function(arr){
        text=''
        for(i=0;i<20;++i){
            text+=timearr[i]+' '
            if(arr[i]) text+='available\n'
            else text+='full\n'
        }
        return text
    }
    app.post('/webhook',convertMiddleWare,rservServices.checkRoom,(req,res)=>{
        
        console.log('intent: ' + agent.intent);
        console.log('locale: ' + agent.locale);
        console.log('query: ', agent.query);
        console.log('session: ', agent.session);
        
        const webhookGetReservations = function(agent){
            room = agent.context.get('hong_wang-custom-followup').parameters['hong.original']
            date = agent.context.get('hong_wang-custom-followup').parameters['date.original']
            a = []
            for(i=0;i<20;++i)a.push(false)
            db.collection('reservations').find({room:room,date:date}).toArray((err,result)=>{
                if(err) return res.status(500).send(err.toString())
                for(i=0;i<result.length;++i)a[result[i].slot]=true;
                return res.send(generateChatRes(a))
            })
        }

        const webhookSave = function(agent){
            agent.context.set({'name':'hong_wang-custom-followup','lifespan':'10','parameters':agent.parameters})
        }

        intentMap = new Map()
        intentMap.set('hong_want - custom - yes',webhookGetReservations)
        intentMap.set('hong_wang - custom',webhookSave)
        req.agent.handleRequest(intentMap)
    })
    app.post('/createUser',(req,res)=>{
        db.collection("users").insertOne({
            _id: req.body.username,
            name: req.body.name,
            password: req.body.password
        }, (err, result) => {
            if (err) return res.status(500).send(err.toString());
            res.send({
                _id: result.ops[0]._id,
                name: result.ops[0].name
            });
        });
    })

    
    
});
