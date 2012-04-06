
function assemble(input) {
	var registers = ['A', 'B', 'C', 'X', 'Y', 'Z', 'I', 'J'];
	var special_registers = ['POP', 'PEEK', 'PUSH', 'SP', 'PC', 'O']; // start at 0x18
	var basic_opcodes = [null, 'SET', 'ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'SHL', 'SHR', 'AND', 'BOR', 'XOR', 'IFE', 'IFN', 'IFG', 'IFB'];

	var output = [];
	var lines = input.split(/\n/);
	var line_positions = [];
	var labels = {};
	var current_line_pos = 0;
	
	try {
		// Assemble lines
		lines.forEach(function(line, line_num) {
		  try {
		    line_positions.push(current_line_pos);
		
		    line = line.toUpperCase(); // for consistency
		    line = line.replace(/^\s+|\s+$/g, '').replace(/\s*;.*/, ''); // trim whitespace and comments
		    if (line != '') {
		        var parts = line.split(/,?\s+/);
		        // console.log(parts);
		        if (parts[0][0] == ':') {
		            labels[parts[0]] = line_num;
		            parts.shift();
		        }
		
		        var op = parts[0];
		        var values = parts.slice(1);
		
		        var bytes = [];
		        var op_byte = 0;
		
		        if (basic_opcodes.indexOf(op) > -1) {
		            op_byte = basic_opcodes.indexOf(op);
		        } else if (op == 'JSR') {
		            values.unshift(0x01);
		        } else {
		            throw 'Invalid operation: ' + op;
		        }
		
		        values.forEach(function(val, i) {
		            var pos = (6 * i + 4);
		
		            if (!isNaN(parseInt(val))) {
		                // literal
		                if (parseInt(val) <= 0x1f) {
		                    op_byte += ((parseInt(val) + 0x20) << pos);
		                } else {
		                    op_byte += 0x1f << pos;
		                    bytes.push(parseInt(val));
		                }
		            } else if (registers.indexOf(val) > -1) {
		                // register
		                op_byte += registers.indexOf(val) << pos;
		            } else if (special_registers.indexOf(val) > -1) {
		                // special register
		                op_byte += (special_registers.indexOf(val) + 0x18) << pos;
		            } else if (val[0] == '[' && val.slice(-1) == ']') {
		                // memory location
		                var loc = val.slice(1, -1);
		                if (loc.indexOf('+') > -1) {
		                    // [literal+register]
		                    var loc_parts = loc.split('+');
		                    op_byte += (0x10 + registers.indexOf(loc_parts[1])) << pos;
		                    bytes.push(parseInt(loc_parts[0]));
		                } else if (!isNaN(parseInt(loc))) {
		                    // [literal]
		                    op_byte += 0x1e << pos;
		                    bytes.push(parseInt(loc));
		                } else if (registers.indexOf(loc) > -1) {
		                    // [register]
		                    op_byte += (0x08 + registers.indexOf(loc)) << pos;
		                }
		            } else if (i == 1) {
		                // label (can only be second value)
		                op_byte += 0x1f << pos;
		                bytes.push(':' + val);
		            } else {
		            	throw 'Invalid value: ' + val;
		            }
		        });
		
		        bytes.unshift(op_byte);
		        output.push(bytes);
		
		        current_line_pos += bytes.length;
		    }
		  } catch (e) {
		    throw e + ' (line ' + line_num + ')';
		  }
		});
		
		// Fill in positions for labels
		output = output.map(function(bytes, i) {
		    return bytes.map(function(b) {
		        if (b[0] == ':') {
		            if (line_positions[labels[b]]) {
		            	return line_positions[labels[b]];
		            } else {
		            	throw 'Label not found: ' + b.slice(0) + ' (line ' + i + ')';
		            }
		        } else {
		            return b;
		        }
		    });
		});
	} catch (e) {
		return e;
	}
	
	// And return output
	return output.map(function(bytes) {
	    return bytes.map(function(b) {
	        return zeroFill(b.toString(16), 4);
	    }).join(' ');
	}).join('<br>');
	
	function zeroFill(number, width) {
	    width -= number.toString().length;
	    if (width > 0) {
	        return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
	    }
	    return number;
	}
}
