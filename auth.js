const jwt = require('jsonwebtoken')
const log = require('./util.js').log
const SECRET = "secretkey"

const requireJWTAuth = function(req,res,next){

    log('called')
    
    if(!req.headers.authorization){
        console.log('No token attached')
        return res.status(401).send('No JWT token provided')
    }
    log('JWT token:',req.headers.authorization)

    try{ 
        decoded = jwt.verify(req.headers.authorization,SECRET)
    }
    catch(err){ 
        log('Verify error:',err.name)
        return res.status(401).send(err.name)
    }
    log('Decoded',decoded)

    db.collection('users').findOne({_id:decoded.sub},(err,result)=>{

        log('Query result:',result)
        log('err result:',err)

        if(err) {
            log(err.toString())
            return res.status(500).send(err.toString())
        }

        if(result) {
            log('success')
            req.payload = decoded
            req.isAdmin = result.isAdmin
            return next()
        }
        else {
            log('Unknown user:',decoded.sub)
            return res.status(401).send('Unknown user')
        }

    })
}

const requireAdmin = function(req,res,next){

    log('called')

    if(req.isAdmin){
        log('is admin')
        next()
    }
    else{
        log('not admin')
        return res.status(401).send('Not an admin')
    }

}

const login = function(req, res){

    log('called')

    if(!req.body.password || !req.body.username){
        log('no username or password')
        return res.status(400).send('No username or password')
    }
    log('username:',req.body.username,'password:',req.body.password)

    db.collection('users')
    .findOne({_id: req.body.username},(err,result)=>{
        log('query result:',result)
        log('err result:',err)
        
        if(err) {
            log(err.toString())
            return res.status(500).send(err.toString())
        }

        if(!result){
            log('Username not found') 
            return res.send({success:false, token: null})   
        }
        else if(req.body.password==result.password) {
            log('success')
            res.send({success: true, username:req.body.username, token: jwt.sign({
                sub: req.body.username,
                name: result.name,
            },SECRET,{expiresIn: '1d'})});
        }
        else {
            log('Wrong password')
            return res.send({success:false, token:null})
        }
    })
}

const signup = function(req,res){
    db.collection("users").insertOne({
        _id: req.body.username,
        name: req.body.name,
        password: req.body.password,
        isAdmin: false
    }, (err, result) => {
        if (err) {
            log(err.toString())
            return res.send({success: false,username: req.body.username})
        }
        return res.send({
            success: true,
            username: result.ops[0]._id,
            name: result.ops[0].name
        })
    })
}

module.exports = {
    login: login,
    requireJWTAuth: requireJWTAuth,
    requireAdmin: requireAdmin,
    SECRET: SECRET,
    signup: signup
}