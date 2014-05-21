var fs = require('fs');
var program = require('commander');
var jpeg = require('jpeg-js');

String.prototype.fill = function(len, chr) {
	var ret = "";
	for(var i = 0; i < len - this.length; i++) {
		ret += chr;
	}
	return ret + this
}

program
	.version('0.0.1')
	.option('-I --input <input>', 'Input file in *.smv format')
	.option('-O --output [output]', 'Output folder', 'out')
	.parse(process.argv);
	
if(!program.input) program.help();

if(!fs.existsSync(program.input)) {
	console.log('File could not be found.')
	process.exit(1);
}

var out = program.output;
if(!fs.existsSync(out)) fs.mkdirSync(out);
var content = fs.readFileSync(program.input);

//search smv header
var found = 0;
var headerpos = -1;
var header = 'SMV002000';
for(var i = 0; i < content.length; i++) {
	if(content[i] == header.charCodeAt(found)) {
		found++;
		if(found == header.length - 1) {
			headerpos = i - found;
			break;
		}
	} else {
		found = 0;
	}
}

if(headerpos == -1) {
	console.log('File is not a valid .smv file.');
	process.exit(1);
}

/*console.log(readStringFromBuffer(content, 9, headerpos));
for(j = 0; j < 15; j++) {
	console.log((10 + j*3) + ': ' + readInt24LE(content, headerpos + 10 + j*3));
}*/

var width = readInt24LE(content, headerpos + 10);
var height = readInt24LE(content, headerpos + 13);
var fpj = readInt24LE(content, headerpos + 37);
var fps = readInt24LE(content, headerpos + 25);
var num_images = readInt24LE(content, headerpos + 28) / fpj;
var jpeg_mod = readInt24LE(content, headerpos + 22);

var offset = headerpos + 55;
var old_offset = offset;
var jpegs = [];

console.log('Writing audio to ' + out + '/' + out + '.wav');
fs.writeFileSync(out + '/' + out + '.wav', content.slice(0, headerpos));

while(num_images > 0) {
	var size = readInt24LE(content, offset - 3);
	//console.log('offset', offset, 'size', size);
	jpegs.push(content.slice(offset, offset + size));
	offset += size;
	//console.log('offset', offset, 'jpeg_mod', jpeg_mod, '(jpeg_mod - (offset - (headerpos+55)))', (jpeg_mod - (offset - (headerpos+55))), '%', (jpeg_mod - (offset - (headerpos+55))) % jpeg_mod);
	offset += (jpeg_mod - (offset - old_offset)) % jpeg_mod;
	old_offset = offset;
	num_images--;	
}

var count = 0;
for(k in jpegs) {
	var img = jpeg.decode(jpegs[k]);
	var hg = img.height / fpj;
	//console.log(img, img.data.length);
	for(l = 0; l < fpj; l++) {
		fs.writeFileSync(out + '/' + out + '-' + count + '.jpg', jpeg.encode({
			'width': img.width,
			'height': height,
			'data': img.data.slice(l * img.width * hg * 4, l * img.width * hg * 4 + img.width * height * 4)
		}).data);
		count++;
		process.stdout.write('\033[0G\33[2K');
		process.stdout.write('Writing image ' + count + '/' + (jpegs.length * fpj) + ' ' + Math.round((count/(jpegs.length * fpj)*100)*1000)/1000 + '% to ' + out + '/' + out + '-' + count + '.jpg');
	}
}
console.log();

function readInt24LE(buf, offset) {
	var arr = [];
	arr.unshift(buf[offset].toString(2).fill(8, '0'));
	arr.unshift(buf[offset + 1].toString(2).fill(8, '0'));
	arr.unshift(buf[offset + 2].toString(2).fill(8, '0'));
	return parseInt(arr.join(''), 2);
}

function readStringFromBuffer(buf, length, offset) {
	var chars = [];
	for(var i = offset; i <= offset + length; i++) {
		chars.push(buf[i]);
	}
	return String.fromCharCode.apply(this, chars);
}