<?php
	$input = $_REQUEST['input'];
	echo assemble($input);
	
	function assemble($input) {
		$registers = array('A', 'B', 'C', 'X', 'Y', 'Z', 'I', 'J');
		$special_registers = array('POP', 'PEEK', 'PUSH', 'SP', 'PC', 'O'); // start at 0x18
		$basic_opcodes = array(null, 'SET', 'ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'SHL', 'SHR', 'AND', 'BOR', 'XOR', 'IFE', 'IFN', 'IFG', 'IFB');
		
		$output = array();
		$lines = preg_split('/\n/', $input);
		$line_positions = array();
		$labels = array();
		$current_line_pos = 0;
		$skipped_lines = 0;
		
		try {
			// Assemble lines
			foreach ($lines as $line_num => $line) {
				try {
					$line_positions[] = $current_line_pos;
					
					$line = strtoupper($line); // for consistency
					$line = preg_replace('/^\s+|\s+$/', '', $line);
					$line = preg_replace('/\s*;.*/', '', $line);
					
					if ($line == '') {
						$skipped_lines++;
					} else {
						$parts = preg_split('/,?\s+/', $line);
						if ($parts[0][0] == ':') {
							$labels[$parts[0]] = $line_num;
							array_shift($parts);
						}
						
						$op = $parts[0];
						$values = array_slice($parts, 1);
						$bytes = array();
						$op_byte = 0;
						
						if (in_array($op, $basic_opcodes)) {
							$op_byte = array_search($op, $basic_opcodes);
						} else if ($op == 'JSR') {
							array_unshift($values, 0x01);
						} else {
							throw new Exception('Invalid operation: ' . $op); 
						}
						
						foreach ($values as $i => $val) {
							$pos = 6 * $i + 4;
							
							if (is_numeric($val)) {
								// literal
								if (intval($val, 16) <= 0x1f) {
									$op_byte += ((intval($val, 16) + 0x20) << $pos);
								} else {
									$op_byte += 0x1f << $pos;
									$bytes[] = intval($val, 16);
								}
							} else if (in_array($val, $registers)) {
								// register
								$op_byte += array_search($val, $registers) << $pos;
							} else if (in_array($val, $special_registers)) {
								// special register
								$op_byte += (0x18 + array_search($val, $special_registers)) << $pos;
							} else if ($val[0] == '[' && substr($val, -1) == ']') {
								// memory location
								$loc = substr($val, 1, -1);
								if (strpos($loc, '+')) {
									// [literal+register]
									$loc_parts = explode('+', $loc);
									$op_byte += (0x10 + array_search($loc_parts[1], $registers)) << $pos;
									$bytes[] = intval($loc, 16);
								} else if (is_numeric($loc)) {
									// [literal]
									$op_byte += 0x1e << $pos;
									$bytes[] = intval($loc, 16);
								} else if (in_array($loc, $registers)) {
									// [register]
									$op_byte += (0x08 + array_search($loc, $registers)) << $pos;
								}
							} else if ($i == 1) {
								// label (can only be second value)
								$op_byte += 0x1f << $pos;
								$bytes[] = ':' . $val;
							} else {
								throw new Exception('Invalid value: ' . $val);
							}
						}
						
						array_unshift($bytes, $op_byte);
						$output[] = $bytes;
						$current_line_pos += count($bytes);
					}
					
				} catch (Exception $e) {
					throw new Exception($e->getMessage() . ' (line ' . ($line_num - $skipped_lines + 1) . ')');
				}
			}

			// Fill in positions for labels
			$processed_output = array();
			foreach ($output as $i => $line) {
				$new_line = array();
				foreach ($line as $byte) {
					if ($byte[0] == ':') {
						if ($line_positions[$labels[$byte]]) {
							$new_line[] = $line_positions[$labels[$byte]];
						} else {
							throw new Exception('Label not found: ' . $byte . ' (line ' . ($i + 1) . ')');
						}
					} else {
						$new_line[] = $byte;
					}
				}
				$processed_output[] = $new_line;
			}
			
			// And return output
			$output_str = '';
			foreach ($processed_output as $line) {
				foreach ($line as $byte) {
					$output_str .= sprintf("%04x ", $byte);
				}
			}
			return $output_str;
		} catch (Exception $e) {
			return $e->getMessage();
		}
	}
?>
