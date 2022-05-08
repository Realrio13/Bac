const noble = require('@abandonware/noble');
const http = require('http');

var address_table = [];
var data_table = [];

function getCounter(peripheral) {
    var part1 = (peripheral.advertisement.manufacturerData[8] * 256 + peripheral.advertisement.manufacturerData[7])
    var part2 = (peripheral.advertisement.manufacturerData[10] * 16777216 + peripheral.advertisement.manufacturerData[9] * 65536)
    return (part1+part2)
}

function SendData(peripheral, counter, pr) {

    const data = JSON.stringify({   // data from bluetooth packet
        address: peripheral.address,
        gatewayName: "gate2",
        manufacturerData: peripheral.advertisement.manufacturerData,
        counter: counter,
        packet_recieved: pr
    })

    const options = {   // server information
        hostname: 'devapi.loghub.sk',
        port: 51415,
        path: '/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    }

    const request = http.request(options, response => {
        // response (empty because we don't need a response) 
    })

    request.on('error', error => {
        console.error(error)
    })

    request.write(data) // send
    request.end()
}

noble.on('stateChange', async (state) => {
    if (state === 'poweredOn') {
        noble.startScanning([], true, (error) => {
            if (error) {
                console.log("Cannot start bluetooth scan. " + error);
                noble.stopScanning();
            } else {
                console.log("Bluetooth scan started.");
            }
        });
    }
});

noble.on('discover', (peripheral) => {
    if (typeof(peripheral.advertisement.localName) !== 'undefined') {
        if (peripheral.advertisement.localName.includes("LHTA")) {
            console.log("kuk")
            const now = new Date().toISOString().
                replace(/T/, ' ').
                replace(/Z/, '')
            if (!address_table.includes(peripheral.address)) { // push new address to list of addresses and new counter
                address_table.push(peripheral.address);
                var counter = getCounter(peripheral);
                data_table.push(counter);
                SendData(peripheral, counter, now);
            }
            else {  // compare counter for an existing address
                var old_counter = data_table[address_table.indexOf(peripheral.address)]
                var new_counter = getCounter(peripheral);
                if (!(new_counter == old_counter)) {
                    data_table[data_table.indexOf(old_counter)] = new_counter   // set new counter
                    SendData(peripheral, new_counter, now)
                }
            }
        }
    }
});