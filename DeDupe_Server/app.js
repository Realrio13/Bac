
const { Console } = require('console');
var http = require('http');
const { connect } = require('http2');
//var JSON = require('JSON');
var address_table = [];
var data_table = [];


var datConnection = connectToDedupeDatabase("127.0.0.1", "Richard", "prifni", "counterlog");

const server = http.createServer(async (req, res) => {
    const buffers = [];

    for await (const chunk of req) {
        buffers.push(chunk);
    }
    const data = Buffer.concat(buffers).toString();
    isDuplicate(JSON.parse(data).address, JSON.parse(data).counter, JSON.parse(data).packet_recieved, JSON.parse(data).gatewayName, datConnection, 4, callback => {
        if (callback) {
            //console.log("Duplicate caught at: " + JSON.parse(data).packet_recieved + " Counter: " + JSON.parse(data).counter);
        }
        else {
            console.log("Packet processed at: " + JSON.parse(data).packet_recieved + " Counter: " + JSON.parse(data).counter);
        }
    })
    res.end();
})

function connectToDedupeDatabase(host,user,password,databaseName) {
    var mysql = require('mysql');

    var datConnection = mysql.createConnection({
        host: host,
        user: user,
        password: password,
        database: databaseName
    });
    datConnection.connect(function (err) {
        if (err) throw err;
    });
    return datConnection;
}

function isDuplicate(address, counter, packet_recieved, gateway, datConnection, nByteCounter, callback) {
    // returns true if duplicate
    // address: address of sending device
    // counter: value of counter in recieved packet
    // datConnection: creatable connection to DeDupe database from above function
    // nByteCounter: number of bytes used for counter (1 to 4)
    var newadr = true;
    if (!address_table.includes(address)) { // push new address to list of addresses and new counter
        address_table.push(address);
        data_table.push(counter);
        newadr = false;
    }
    if (newadr) {
        if (!(counter == data_table[address_table.indexOf(address)])) {
            data_table[data_table.indexOf(data_table[address_table.indexOf(address)])] = counter;   // set new counter
        }
        else {
            callback(true);
            return;
        } 
    }
    datConnection.query("SELECT * FROM counter_log WHERE address = \'" + address + "\';", function (err, result, fields) {
        if (err) throw err;
        if (result[0] == null) { // create new entry in database

            const now = new Date().toISOString().
                replace(/T/, ' ').
                replace(/Z/, '')
            datConnection.query("INSERT INTO dedupe_test2 (address,counter,created_at,packet_recieved,gateway) VALUES (\'" + address + "\', " + counter.toString() + ", \'" + now + "\', \'" + packet_recieved + "\', \'" + gateway + "\');", function (err, result, fields) {
                if (err) throw err;
            });
            
            datConnection.query("INSERT INTO counter_log (address,counter,last_updated) VALUES (\'" + address + "\', " + counter.toString() + ", CURRENT_TIMESTAMP);", function (err, result, fields) {
                if (err) throw err;
            });
            
            callback(false);
        }
        else {                  // update entry in database
            var oldCounter = result[0].counter;
            var counterMax = Math.pow(2, nByteCounter * 8) - 300;
            //                                              ^^ leeway for counter overflow control
            if ((counter < oldCounter - counterMax) || ((counter > oldCounter) && (counter < oldCounter + 300))) {
                //     counter overflow                    new counter has higher value than old by max 7
                const now = new Date().toISOString().
                    replace(/T/, ' ').
                    replace(/Z/, '')
                datConnection.query("INSERT INTO dedupe_test2 (address,counter,created_at,packet_recieved,gateway) VALUES (\'" + address + "\', " + counter.toString() + ", \'" + now + "\', \'" + packet_recieved + "\', \'" + gateway + "\');", function (err, result, fields) {
                    if (err) throw err;
                });
                
                datConnection.query("UPDATE counter_log SET counter = " + counter.toString() + ", last_updated = CURRENT_TIMESTAMP WHERE address = \'" + address + "\';", function (err, result, fields) {
                    if (err) throw err;
                });
                
                
                callback(false);
            }
            else {
                const lastUpdate = Date.parse(result[0].last_updated);
                if (Date.now() - lastUpdate > 300000) {
                    // if time passed since last update is greater than 5 mins: not a duplicate
                    const now = new Date().toISOString().
                        replace(/T/, ' ').
                        replace(/Z/, '')
                    datConnection.query("INSERT INTO dedupe_test2 (address,counter,created_at,packet_recieved,gateway) VALUES (\'" + address + "\', " + counter.toString() + ", \'" + now + "\', \'" + packet_recieved + "\', \'" + gateway + "\');", function (err, result, fields) {
                        if (err) throw err;
                    });
                    
                    datConnection.query("UPDATE counter_log SET counter = " + counter.toString() + ", last_updated = CURRENT_TIMESTAMP WHERE address = \'" + address + "\';", function (err, result, fields) {
                        if (err) throw err;
                    });
                    
                    
                    callback(false);
                }
                else {
                    callback(true);
                }
            }
        }
    });
}
server.listen(5000);