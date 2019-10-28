const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
cors = require('cors');
const MongoClient = require('mongodb').MongoClient
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
//const jwt = require("jwt-simple");
const jwt = require('jsonwebtoken')
const passport = require("passport");
const ExtractJwt = require("passport-jwt").ExtractJwt;
const JwtStrategy = require("passport-jwt").Strategy;
const SECRET = "secretkey";
const https = require('https');
const fs = require('fs');
const ADMIN = "admin@mail.com"
app.use(cors());
app.options('*', cors());

const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromHeader("authorization"),
    secretOrKey: SECRET
 };
 
 /*const jwtAuth = new JwtStrategy(jwtOptions, (payload, done) => {
    db.collection('users').findOne({_id:payload.sub},(err,result)=>{
        if(err) done(true,false);
        if(result)done(null, true);
        else done(null,false)
    });
 });
 passport.use(jwtAuth);
 const requireJWTAuth = passport.authenticate("jwt",{session:false});*/
requireJWTAuth = function(req,res,next){
    if(!req.headers.authorization) return res.status(401).send('Unauthorized');
    try{
        decoded = jwt.verify(req.headers.authorization,SECRET);
    }
    catch(err){
        return res.status(401).send('Invalid Token')
    }
    console.log(decoded)
    db.collection('users').findOne({_id:decoded.payload.sub},(err,result)=>{
        console.log(result)
        if(err) return res.status(500).send(err.toString())
        if(result){
            return next()
        }
        else{
            return res.status(401).send('Unknown user')
        }
    });
}
MongoClient.connect("mongodb://localhost:27017", { useUnifiedTopology: true },(error, client) => {
    
    if(error) throw error;
    db = client.db('IWantThisRoom');
	
   app.listen(3000,()=>{
        console.log('listening on port 3000');
    })

    const loginMiddleWare = (req, res, next) => {
        if(!req.body.password || !req.body.username) return res.status(400).send('No username or password')
        db.collection("users").findOne({_id: req.body.username},(err,result)=>{
            if(err) return res.status(500).send(err.toString());
            if(result) 
                if(req.body.password==result.password) next();
		        else res.send({success:false, token:null});
            else
                res.send({success:false, token: null});
        });
    };

    app.get('/test',(req,res)=>{
        res.send('Hello');
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

    app.post('/login',loginMiddleWare,(req,res)=>{
        const payload = {
            sub: req.body.username,
            iat: new Date().getTime()
        }
        res.send({success: true, username:req.body.username, token: jwt.sign({payload,},SECRET,{expiresIn: '1d'})});
    })

    app.get('/users',requireJWTAuth,(req,res)=>{
        db.collection("users").find().toArray((err, result) => {
            if (err) return res.status(500).send(err.toString());
            res.status(200).json(result);
        });
    })
    
    app.post('/timeslots',(req,res)=>{
        if(!req.body.room) req.body.room='testRoom'
        if(!req.body.date) req.body.date='testDate'
        db.collection('reservations').find({room: req.body.room, date:req.body.date}).toArray((err,result)=>{
            if(err) return res.status(500).send(err.toString());
            const defaultTimeslot={
                reserved: false,
                reserver: null,
                _id: null,
            }
            arr = [];
            for(i=0;i<20;++i){arr.push(JSON.parse(JSON.stringify(defaultTimeslot)));}
            for(i=0;i<result.length;++i){
                arr[result[i].slot].reserved=true;
                arr[result[i].slot].reserver=result[i].reserver;
                arr[result[i].slot]._id=result[i]._id;
            }
            res.send(arr);
        })
    })

    app.get('/userReservations',requireJWTAuth,(req,res)=>{
        payload = jwt.verify(req.headers.authorization,SECRET);
        db.collection('reservations').find({reserver: payload.sub}).toArray((err,result)=>{
            if(err) return res.status(500).send(err.toString());
            res.send(result);
        })
    })

    app.get('/roomReservations',requireJWTAuth,(req,res)=>{
        db.collection('reservations').find({room: req.body.room}).toArray((err,result)=>{
            if(err) return res.status(500).send(err.toString());
            res.send(result);
        })
    })

    app.get('/dateReservations',requireJWTAuth,(req,res)=>{
        db.collection('reservations').find({date: req.body.date}).toArray((err,result)=>{
            if(err) return res.status(500).send(err.toString());
            res.send(result);
        })
    })

    app.patch('/reset',(req,res)=>{
        
        db.collection('reservations').remove({},(err,res)=>{
            if(err) return res.status(500).send(err.toString())
            res.send('OK')
        });
    })

    app.post('/reserveOne',requireJWTAuth,(req,res)=>{
        if(!req.body.slot) return res.status(400).send("No slot");
        if(!req.body.room) req.body.room='testRoom'
        if(!req.body.date) req.body.date='testDate'
        payload = jwt.verify(req.headers.authorization,SECRET);
        db.collection('reservations').find({room:req.body.room,date:req.body.date,slot: req.body.slot}).toArray((err,result)=>{
            if(err) return res.status(500).send(err.toString());
            if(result.length!=0){
                res.send({success:false ,reservationDetails: result[0]});
            }
            else{
                db.collection('reservations').insertOne({reserver: payload.sub,room: req.body.room,date: req.body.date,slot: req.body.slot},(err,response)=>{
                    if(err) return res.status(500).send(err.toString());
                    res.send({success:true, reservationDetails: response.ops[0]});
                });
            }
        });
    });

    app.patch('/freeOne',requireJWTAuth,(req,res)=>{
        if(!req.body.slot) return res.status(400).send("No slot");
        if(!req.body.room) req.body.room='testRoom'
        if(!req.body.date) req.body.date='testDate'
        payload = jwt.verify(req.headers.authorization,SECRET);
        db.collection('reservations').find({room:req.body.room,date:req.body.date,slot: req.body.slot}).toArray((err,result)=>{
            if(err) return res.status(500).send(err.toString());
            if(result.length>0){
                if(result[0].reserver==payload.sub){
                    db.collection('reservations').deleteOne(result[0],(err,response)=>{
                        if(err) return res.status(500).send(err.toString());
                        res.send({success:true, reservationDetails: result[0]});
                    });
                }
                else res.send({success:false, reservationDetails: result[0]});
            }
            else res.send({success:false ,reservationDetails: null});
        });
    })

    app.post('/reserve',requireJWTAuth,(req,res)=>{
        payload = jwt.verify(req.headers.authorization,SECRET);
        for(i=0;i<req.body.length;++i){
            if(!req.body[i].slot) return res.status(400).send("No slot");
            if(!req.body[i].date)req.body[i].date = 'testDate'
            if(!req.body[i].room)req.body[i].room = 'testRoom'
        }
        db.collection('reservations').find({$or:req.body}).toArray((err,result)=>{
            if(err) return res.status(500).send(err.toString());
            if(result.length!=0){
                //some slot is already reserved
                res.send({success: false, fail: result})
            }
            else{
                for(i=0;i<req.body.length;++i){
                    req.body[i].reserver = payload.sub
                }
                db.collection('reservations').insertMany(req.body,(err,result)=>{
                    if(err) return res.status(500).send(err.toString())
                    res.send({success: true, fail:null})
                })
            }
        }
        )
    })

    const reservationComp = (a,b)=>{
        if(a.room==b.room){
            if(a.date==b.date){
                if (a.slot==b.slot) return 0;
                return a.slot>b.slot?1:-1
            }
            else return a.date>b.date?1:-1
        }
        else return a.room>b.room?1:-1
    }

    const binarySearch = function(arr,val,start,end){
        if(start>end) return -1;
        mid = Math.floor((start+end)/2);
        comp = reservationComp(arr[mid],val)
        if(comp==0) return mid;
        else if(comp==1) return binarySearch(arr,val,start,mid-1);
        else return binarySearch(arr,val,mid+1,end);

    } 
    app.patch('/free',(req,res)=>{
        payload = jwt.verify(req.headers.authorization,SECRET);
        for(i=0;i<req.body.length;++i){
            if(!req.body[i].slot) return res.status(400).send("No slot");
            if(!req.body[i].date)req.body[i].date = 'testDate'
            if(!req.body[i].room)req.body[i].room = 'testRoom'
        }
        db.collection('reservations').find({$or:req.body}).toArray((err,result)=>{
            if(err) return res.status(500).send(err.toString());
            result.sort(reservationComp)
            req.body.sort(reservationComp)
            fail=[]
            for(i=0;i<req.body.length;++i){
                index = binarySearch(result,req.body[i],0,result.length-1)
                if(index==-1){
                    req.body[i].reserver=null
                    req.body[i]._id=null
                    fail.push(req.body[i])
                }
                else if(payload.sub!=ADMIN&&payload.sub!=result[index].reserver){
                    fail.push(result[index])
                }
            }
            if(fail.length!=0)
                res.send({success: false,fail: fail});
            else
            db.collection('reservations').deleteMany({$or:result},(err,result1)=>{
                if(err) return res.status(500).send(err.toString());   
                res.send({success: true, fail: null});
            })
        })
    })
    
});
