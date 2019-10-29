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
    app.post('/reserve',[authServices.requireJWTAuth,rservServices.checkDataValidity],rservServices.reserve)
    app.patch('/free',[authServices.requireJWTAuth,rservServices.checkDataValidity],rservServices.free)
    app.get('/userReservations',authServices.requireJWTAuth,rservServices.getUserReservations)

    app.get('/admin/users',[authServices.requireJWTAuth,authServices.requireAdmin],adminServices.getUsers)
    app.post('/admin/queryReservations',[authServices.requireJWTAuth,authServices.requireAdmin], adminServices.queryReservations)
	
   app.listen(3000,()=>{
        console.log('listening on port 3000');
    })

    app.get('/test',(req,res)=>{
        res.send('Hello');
    })

    app.post('/webhook',(req,res)=>{
        const agent = new WebhookClient({
            request: req,
            response: res
          });
        console.log('intent: ' + agent.intent);
        console.log('locale: ' + agent.locale);
        console.log('query: ', agent.query);
        console.log('session: ', agent.session);
        
        const webhookGetReservations = function(agent){
            agent.add("reservation!!!")
        }

        intentMap = new Map()
        intentMap.set('hong_wan',webhookGetReservations)
        agent.handleRequest(intentMap)
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
