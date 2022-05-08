class DeDupe {
	constructor(counterBytes){
		this.address_table = [];
		this.data_table = [];
		this.counterMax = Math.pow(2, counterBytes * 8) - 8;
		this.addressRules = [];
		this.rules=[];
	}
	addRule(address, rule) {
		this.addressRules.push(address);
		this.rules.push(rule);
	}
	isDuplicate(address, counter) { // returns true if packet is a duplicate
		if (!isNaN(counter)){
			if (!this.address_table.includes(address)) { // push new address to list of addresses and new counter
	        	this.address_table.push(address)
	        	this.data_table.push(counter)    // 2 byte counter
	        	return false;
	        }
	        else {  // compare counter for an existing address
	        	const old_counter = this.data_table[this.address_table.indexOf(address)]
	        	if (counter != old_counter) {
                	this.data_table[this.data_table.indexOf(old_counter)] = counter   // set new counter
                	return false;
	            }
	        }
	        return true;
		}
		else {
			let index = 9999;
			for (let i = 0; i < this.addressRules.length; i++) {
				if (address.includes(this.addressRules[i])) {
					index = i;
					break;
				}
			}
			if (index == 9999) {
				console.log("No rule set for address: " + address + " , please set a rule or use isDuplicate with a counter.")
				return;
			}
			else {
				let exponent = 0;
				let position = 0;
				let temp = 0;
				let extractedCounter = 0;
				let max = this.rules[index].length;
				try {
					do {
						max--;
						while (!isNaN(this.rules[index][max])) {
							position = position + (this.rules[index][max] * Math.pow(10, temp))
							temp++
							max--;
						}
						extractedCounter = extractedCounter + (counter[position] * Math.pow(2, exponent));
						temp = 0;
						position = 0;
						exponent = exponent + 8;
					} while (max > 0);
				} catch (error) {
					console.log("Invalid rule set for address: " + address)
					return;
				}
				return this.isDuplicate(address, extractedCounter);
			}
			return false
		}
	}
}
exports.DeDupe = DeDupe;