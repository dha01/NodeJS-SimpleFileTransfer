var fs = require('fs');
var net = require('net');

var ip_address = '192.168.1.64';
var port = 1235;

var file_name = '2.mp4';

// Максимальнй размер одного сообщения.
var max_size = 65536;

// Принять файл.
var ReceiveFile = 1;

// Принять файл и вызвать подпрограмму.
var ReveiveFileAndExecProc = 2;

var file_count = 0;

require('net').createServer(function (socket) {
    console.log("connected");
    var remote_ip = socket.remoteAddress;
    var pos = 0;
    var cur_id = file_count;
    // Генерируем уникальное имя для файла.
    var tmp_file_name = 'recive_file_' + cur_id;
    var fd = fs.openSync(tmp_file_name, 'w');
    file_count++;
    var message_type = -1;

    // Получаем файл.
    socket.on('data', function (data) {
        if(pos == 0){
            message_type = data[0];
            fs.writeSync(fd, data, 1, data.byteLength - 1, pos);
            pos += data.byteLength - 1;
        }
        else
        {
            fs.writeSync(fd, data, 0, data.byteLength, pos);
            pos += data.byteLength;
        }
        //console.log(cur_id + ' ' + pos);
    });

    socket.on('end', function() {
        console.log('Получен файл.');
        fs.closeSync(fd);

        if(message_type == ReveiveFileAndExecProc) {
            ExecProcAndSendFile(tmp_file_name, remote_ip);
        }
    });
}).listen(port);

// Вызов подпрограммы и отправка результата по адресу.
function ExecProcAndSendFile(file_name, ip_address){
    const exec = require('child_process').exec;
    var copy_file_name = file_name + '_copy';
    exec('CopyPaster.exe ' + file_name + ' ' + copy_file_name, function (err, stdout, stderr) {
        // Возвращаем результат выполнения по указанному IP-адресу.
        Send(ip_address, 1234, copy_file_name, ReceiveFile);
        console.log('Выполнена подпрограмма и результат отправлен по адресу ');
        fs.unlink(copy_file_name);
        fs.unlink(file_name);
    });
}

// Отправляет файл по указанному адресу.
function Send(ip, port, file_name, type) {
    // Открываем файл для чтения.
    fd = fs.openSync(file_name, 'r');
    console.log(ip + ':' + port);
    // Устанавливаем соединение через сокет.
    var client = net.connect({ host: ip, port: port });

    var s_buffer = new Buffer(1);
    s_buffer[0] = type;
    // Отправляем тип сообщения.
    client.write(s_buffer);

    var buffer = new Buffer(max_size);
    var pos = 0;

    // Отправляем файл блоками размером MAX_PART_SIZE байт, до тех пор пока не будет считан весь файл.
    while (true) {
        var size = fs.readSync(fd, buffer, 0, max_size, pos);

        //console.log(size);
        if (size == 0) {break; }

        pos += size;
        var send_buffer = new Buffer(size);
        buffer.copy(send_buffer, 0, 0, size);
        client.write(send_buffer);
    }
    fs.closeSync(fd);

    // Закрываем сокет.
    client.end();
}

// Отправляем файл.
Send(ip_address, port, file_name, ReveiveFileAndExecProc);