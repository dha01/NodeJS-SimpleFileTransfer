var fs = require('fs');
var net = require('net');

var ip_address = '192.168.1.64';
var port = 1234;

var remote_port = 1235;

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
    var tmp_file_name = 'recive_file_' + new Date().getTime() + '_' + cur_id;
    var message_type = -1;

    console.log(tmp_file_name);
    var writable = fs.createWriteStream(tmp_file_name);

    socket.on('data',function (data) {
        if(message_type == -1)
        {
            message_type = data.slice(0,1)[0];
            writable.write(data.slice(1));
            console.log('type = ', message_type);
        }
        else
        {
            writable.write(data);
        }
    });

    // Файл был получен.
    socket.on('end', function() {
        writable.end();
        if(message_type == ReveiveFileAndExecProc) {
            ExecProcAndSendFile(tmp_file_name, remote_ip);
        }

        console.log('Получен файл.');
    });
}).listen(port);

// Вызов подпрограммы и отправка результата по адресу.
function ExecProcAndSendFile(file_name, ip_address){
    const exec = require('child_process').exec;
    var copy_file_name = file_name + '_copy';
    console.log('Copy ' + file_name);
    exec('CopyPaster.exe ' + file_name + ' ' + copy_file_name, function (err, stdout, stderr) {
        // Возвращаем результат выполнения по указанному IP-адресу.
        Send(ip_address, remote_port, copy_file_name, ReceiveFile, function(){
            fs.unlink(copy_file_name);
            fs.unlink(file_name);
        });
        console.log('Выполнена подпрограмма и результат отправлен по адресу ');
    });
}

// Отправляет файл по указанному адресу.
function Send(ip, port, file_name, type, callback) {
    var file = fs.createReadStream(file_name);
    var client = net.connect({ host: ip, port: port }, connected);
    console.log(ip + ':' + port);

    function connected() {
        client.write(new Buffer(type));
        file.pipe(client);
    }

    file.on('end', callback);
}

// Отправляем файл.
//Send(ip_address, port, send_file_name, ReveiveFileAndExecProc);