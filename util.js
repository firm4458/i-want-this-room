dev = false
observedFuncs = ['requireJWTAuth','login','logRequests']

const log = function(...msg){
    if(!dev) return 
    if(!observedFuncs.find((x)=>x==log.caller.name.toString())) return
    console.log(log.caller)
    console.log(msg)
}

const logRequests = function(req,res,next){
    log({url: req.url,method: req.method,headers: req.headers, ip: req.connection.remoteAdress})
    return next()
}

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

module.exports = {
    log:log,
    reservationComp:reservationComp,
    binarySearch:binarySearch,
    logRequests: logRequests
}