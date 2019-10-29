const util = require('./util.js')
const log = require('./util.js').log

const defaultTimeslot={
    reserved: false,
    reserver: null,
    _id: null,
}


const getTimeslots = function(req,res){

    log('called')
    if(!req.body.room){
        log('No room in body, default to testRoom')
        req.body.room='testRoom'
    }
    if(!req.body.date){ 
        log('No date in body, default to testDate')
        req.body.date='testDate'
    }
    log('room',req.body.room,'date',req.body.date)

    const makeTimeslot = function(err,result){

        log('query result:',result)
        log('err result:',err)

        if(err) {
            log(err.toString())
            return res.status(500).send(err.toString())
        }

        arr = [];
        for(i=0;i<20;++i) arr.push(JSON.parse(JSON.stringify(defaultTimeslot)))
        for(i=0;i<result.length;++i){

            arr[result[i].slot].reserved=true;
            arr[result[i].slot].reserver=result[i].reserver
            arr[result[i].slot]._id=result[i]._id;

        }
        log('timeslot arrays:',arr)
        res.send(arr);
    }
    query = {room: req.body.room, date:req.body.date}
    db.collection('reservations').find(query).toArray(makeTimeslot)
}


const checkDataValidity = function(req,res,next){

    log('called')
    log('body',req.body)
    if(!Array.isArray(req.body)) req.body = [req.body]

    alldata = []
    for(i=0;i<req.body.length;++i){

        if(req.body[i].slot==null || req.body[i]==undefined){
            log('element#'+i.toString()+'has no slot')
            return res.status(400).send("No slot");
        }
        if(!req.body[i].date){
            log('element#'+i.toString()+'has no date, default to testDate')
            req.body[i].date = 'testDate'
        }
        if(!req.body[i].room){
            log('element#'+i.toString()+'has no date, default to testDate')
            req.body[i].room = 'testRoom'
        }

        alldata.push({
            room: req.body[i].room,
            date: req.body[i].date,
            slot: req.body[i].slot.toString()
        })
    }
    req.body = alldata
    log('data',alldata)

    return next()
}

const reserve = function(req,res){

    log('called')

    const successCallback = function(err,result){
        if(err) {
            log(err.toString())
            return res.status(500).send(err.toString())
        }
        log('success')
        res.send({success: true, fail:null})
    }    
    const checkAvailability = function(err,result){

        if(err) {
            log(err.toString())
            return res.status(500).send(err.toString())
        }

        if(result.length!=0){
            log('some slot is full',result)
            return res.send({success: false, fail: result})
        }

        for(i=0;i<req.body.length;++i){
            req.body[i].reserver = req.payload.sub
        }
        log('inserting into Database')
        db.collection('reservations').insertMany(req.body,successCallback)
    }
    query = {$or:req.body}
    
    db.collection('reservations').find(query).toArray(checkAvailability)
}

const free = function(req,res){

    log('called')

    const successCallback = function(err,result){
        if(err) {
            log(err.toString())
            return res.status(500).send(err.toString())
        }
        log('success')
        res.send({success: true, fail:null})
    }    

    const checkUnfreeable = function(err,result){

        log('freeable',result)
        result.sort(util.reservationComp)
        req.body.sort(util.reservationComp)

        fail=[]
        for(i=0;i<req.body.length;++i){
            index = util.binarySearch(result,req.body[i],0,result.length-1)
            if(index==-1){
                log(req.body[i],'is not reserved')
                req.body[i].reserver=null
                req.body[i]._id=null
                fail.push(req.body[i])
            }
            else if(!req.isAdmin&&req.payload.sub!=result[index].reserver){
                log(req.body[i],'is reserved by', result[index].reserver)
                fail.push(result[index])
            }
        }
        if(fail.length!=0){
            log('cannot free some slot')
            return res.send({success: false,fail: fail});
        }
        db.collection('reservations').deleteMany({$or:result},successCallback)
    }

    query = {$or:req.body}
    db.collection('reservations').find(query).toArray(checkUnfreeable)
}

const getUserReservations = function(req,res){
    log('called')
    db.collection('reservations').find({reserver: req.payload.sub}).toArray((err,result)=>{
        if(err) return res.status(500).send(err.toString());
        if(result) return res.send(result);
        else return res.send([])
    })
}

const checkRoom = function(req,res,next){
    rooms = new Set()
    for(i=0;i<req.body.length;++i) rooms.add(req.body[i].room)
    rooms = Array.from(rooms)
    for(i=0;i<rooms.length;++i) rooms[i] = {_id: rooms[i]}
    db.collection('rooms').find({$or:rooms}).toArray((err,result)=>{
        if(err) res.status(500).send(err.toString())
        if(result.length==rooms.length) next()
        else res.status(400).send('Unknown rooms')
    })
}

module.exports = {
    getTimeslots: getTimeslots,
    reserve: reserve,
    checkDataValidity : checkDataValidity,
    checkRoom: checkRoom,
    free: free,
    getUserReservations: getUserReservations
}