var fs = require('fs');
var net = require('net');
var streamm = require( "stream" );

var ip_address = '192.168.1.64';
var port = 1234;

var send_file_name = '1.jpg';
var receive_file_name = 'receive.jpg'

// Принять файл.
var ReceiveFile = 1;

// Принять файл и вызвать подпрограмму.
var ReveiveFileAndExecProc = 2;

var file_count = 0;

require('net').createServer(function (socket) {
    console.log("connected");

    var cur_id = file_count;
    file_count++;

    // Генерируем уникальное имя для файла.
    var tmp_file_name = 'recive_file_' + cur_id;
    var message_type = -1;

    var writable = fs.createWriteStream(tmp_file_name);

    // Получаем файл.
    socket.on('data', function (data) {
        var bufferStream = new streamm.PassThrough();
        if(message_type == -1)
        {
            message_type = data.slice(0,1)[0];
            bufferStream.write(data.slice(1));
            console.log('type = ', message_type);
        }
        else
        {
            bufferStream.write(data);
        }
        bufferStream.pipe(writable).setMaxListeners(20);
    });

    // Файл был получен.
    socket.on('end', function() {
        console.log('Получен файл.');
        var bufferStream = new streamm.PassThrough();
        bufferStream.end();
        bufferStream.pipe(writable);

        if(message_type == ReveiveFileAndExecProc) {
            ExecProcAndSendFile(tmp_file_name, socket.remoteAddress);
        }
    });
}).listen(port);

// Вызов подпрограммы и отправка результата по адресу.
function ExecProcAndSendFile(file_name, ip_address){
    const exec = require('child_process').exec;
    var copy_file_name = file_name + '_copy';
    exec('CopyPaster.exe ' + file_name + ' ' + copy_file_name, function (err, stdout, stderr) {
        // Возвращаем результат выполнения по указанному IP-адресу.
        Send(ip_address, port, copy_file_name, ReceiveFile);
        console.log('Выполнена подпрограмма и результат отправлен по адресу ');
    });
}

// Отправляет файл по указанному адресу.
function Send(ip, port, file_name, type) {
    var file = fs.createReadStream(send_file_name);
    var client = net.connect({ host: ip, port: port }, connected);

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
Send(ip_address, port, send_file_name, ReveiveFileAndExecProc);