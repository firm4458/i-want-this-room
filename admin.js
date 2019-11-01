log = require('./util.js').log

const queryReservations = function(req,res){
    log('called')
    log('data',req.body)
    if(!req.body || Array.isArray(req.body)){
        log('invalid data')
        return res.status(400).send('Invalid data')
    }
    db.collection('reservations').find(req.body).toArray((err,result)=>{
        log('result',result)
        log('err',err)
        if(err) return res.status(500).send(err.toString())
        return res.send(result);
    })
}

const getUsers = function(req,res){
    log('called')
    db.collection("users").find().toArray((err, result) => {
        log('result',result)
        log('err',err)
        if (err) return res.status(500).send(err.toString())
        return res.send(result);
    });
}

const createRoom = function(req,res){
    log('called')
    if(!req.body.name) return res.status(400).send('name cant be blank')
    db.collection('rooms').insertOne({_id: req.body.name},(err,result)=>{
        if(err) return res.status(500).send(err.toString())
        return res.send('ok')
    })
}

const deleteRoom = function(req,res){
    db.collection('rooms').deleteOne({_id:req.body.name},(err,result)){
        if(err) return res.status(500).send(err.toString())
        return res.send('ok')
    }
}
module.exports = {
    getUsers: getUsers,
    queryReservations: queryReservations,
    createRoom: createRoom,
    deleteRoom: deleteRoom
}