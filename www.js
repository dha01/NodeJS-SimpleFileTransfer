var fs = require('fs');
var net = require('net');
var streamm = require( "stream" );

var ip_address = '192.168.1.64';
var port = 1234;

var remote_port = 1235;

var send_file_name = '1.jpg';
var receive_file_name = 'receive.jpg'

// Принять файл.
var ReceiveFile = 1;

// Принять файл и вызвать подпрограмму.
var ReveiveFileAndExecProc = 2;

var file_count = 0;

require('net').createServer(function (socket) {
    console.log("connected");
    var remote_ip = socket.remoteAddress;

    var cur_id = file_count;
    file_count++;

    // Генерируем уникальное имя для файла.
    var tmp_file_name = 'recive_file_' + cur_id;
    var message_type = -1;

    console.log(tmp_file_name);

    var writable = fs.createWriteStream(tmp_file_name);

    function wait_first_block( data ) {
        // первой командой уберем слушатель (важно что первой)
        // пример по removeListener http://stackoverflow.com/questions/23893872/how-to-properly-remove-event-listeners-in-node-js-eventemitter
        socket.removeListener( 'data',wait_first_block);
        message_type = data.slice(0,1)[0];
        console.log('type = ', message_type);
        writable.write(data.slice(1), function() {
            socket.pipe( writable ); // после того как запишем 1 блок, остальное pipe-им
        });
    }

    socket.on('data',wait_first_block);

    // Файл был получен.
    socket.on('end', function() {
        console.log('Получен файл.');
        var bufferStream = new streamm.PassThrough();
        bufferStream.end();
        bufferStream.pipe(writable);

        if(message_type == ReveiveFileAndExecProc) {
            ExecProcAndSendFile(tmp_file_name, remote_ip);
            //fs.unlink(file_name);
        }
    });
}).listen(port);

// Вызов подпрограммы и отправка результата по адресу.
function ExecProcAndSendFile(file_name, ip_address){
    const exec = require('child_process').exec;
    var copy_file_name = file_name + '_copy';
    console.log('Copy ' + file_name);
    exec('CopyPaster.exe ' + file_name + ' ' + copy_file_name, function (err, stdout, stderr) {
        // console.log(err);
        // Возвращаем результат выполнения по указанному IP-адресу.
        Send(ip_address, remote_port, copy_file_name, ReceiveFile);
        console.log('Выполнена подпрограмма и результат отправлен по адресу ');
        //fs.unlink(copy_file_name);
    });
}

// Отправляет файл по указанному адресу.
function Send(ip, port, file_name, type) {
    var file = fs.createReadStream(file_name);
    var client = net.connect({ host: ip, port: port }, connected);
    console.log(ip + ':' + port);
    function connected() {
        var bufferStream = new streamm.PassThrough();
        var data = new Buffer(1);
        data[0] = type;
        bufferStream.write(data);
        bufferStream.pipe(client);
        file.pipe(client);
    }
}

// Отправляем файл.
//Send(ip_address, port, send_file_name, ReveiveFileAndExecProc);