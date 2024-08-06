// Copyright (C) 2004-2024 Murilo Gomes Julio
// SPDX-License-Identifier: GPL-2.0-only

// Mestre da Info
// Site: https://www.mestredainfo.com.br

const { app, BrowserWindow, Menu, MenuItem, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const sOS = require('os');
const { spawn } = require('child_process');
const sHttp = require('http');

const sPlataform = sOS.platform().toLowerCase();
const miappsPath = app.getAppPath().replace('app.asar', '');

let sSistemaPasta = '';
let sArgs = process.argv;
let sArgv = '';
if (sArgs[1] == '.') {
    if (sArgs[2]) {
        sSistemaPasta = sArgs[2]
    } else {
        app.quit();
        return false;
    }
    sArgv = sArgs.slice(3).toString();
} else {
    if (sArgs[1]) {
        sSistemaPasta = sArgs[1]
    } else {
        app.quit();
        return false;
    }
    sArgv = sArgs.slice(2).toString();
}

const milangs = require(path.join(app.getAppPath(), '/milang.js'));
const milang = new milangs(sPlataform, sSistemaPasta);

process.on('uncaughtException', (error) => {
    console.error(milang.traduzir('Exceção não tratada:'), error);
});

if (!fs.existsSync(path.join(sSistemaPasta, '/app/config/config.json'))) {
    console.error(milang.traduzir('Não foi possível encontrar o arquivo %s', '"config.json"'));

    app.quit();
    return false;
}

const miupdates = require(path.join(app.getAppPath(), '/miupdate.js'));
const miupdate = new miupdates(milang);

const config = JSON.parse(fs.readFileSync(path.join(sSistemaPasta, '/app/config/config.json'), 'utf-8'));

if (config.app.desativarAceleracaoHardware) {
    app.disableHardwareAcceleration();
}

if (config.app.nome) {
    app.setName(config.app.nome);
}

let sFolderID = '';
if (config.app.id) {
    sFolderID = path.join(sOS.userInfo().homedir, '.' + config.app.id)
    if (!fs.existsSync(sFolderID)) {
        fs.mkdirSync(sFolderID);
    }
}

let sStartApp = true;
let sServerName;
let miServidorProcess;
let sPort;

const createWindow = () => {
    miappsNewWindow('', config.app.largura, config.app.altura, config.app.redimensionar, config.app.quadro, false);

    miupdate.checkUpdate();
}

// Aplica permissão de execução para o MIServidor
function perm(filephp) {
    if (config.php.linux.perm) {
        spawn('chmod', ['+x', filephp]);
        config.php.linux.perm = false;

        fs.writeFileSync(path.join(miappsPath, '/app/config/config.json'), JSON.stringify(config, '', "\t"));

        console.log(milang.traduzir('Aplicado permissão de execução para o %s', path.basename(filephp)));
    }
}

// Inicia o MIServidor
function startMIServidor(win) {
    let sMIServidor;
    let sFilePHPINI;

    if (sPlataform == 'linux') {
        sMIServidor = path.join(miappsPath, '/php/linux/miservidor');

        if (config.php.linux.ini) {
            sFilePHPINI = path.join(sSistemaPasta, '/php/linux/php.ini');
        } else {
            sFilePHPINI = path.join(miappsPath, '/php/linux/php.ini');
        }

        perm(sMIServidor);
    } else if (sPlataform == 'win32') {
        sMIServidor = path.join(miappsPath, '/php/win32/php.exe');
        if (config.php.win32.ini) {
            sFilePHPINI = path.join(sSistemaPasta, '/php/win32/php.ini');
        } else {
            sFilePHPINI = path.join(miappsPath, '/php/win32/php.ini');
        }
    } else {
        app.quit();
    }

    // Environment
    process.env.MIAPPS_ARGS = sArgv;
    process.env.MIAPPS_USERNAME = sOS.userInfo().username;
    process.env.MIAPPS_HOMEDIR = sOS.userInfo().homedir;
    process.env.MIAPPS_PLATFORM = sPlataform;
    process.env.MIAPPS_APPDIR = path.join(sSistemaPasta, '/app/');

    // Servidor
    let sCreateServer = sHttp.createServer();
    let sListen = sCreateServer.listen();
    sPort = sListen.address().port;
    sListen.close();
    sCreateServer.close();

    miServidorProcess = spawn(sMIServidor, ['-S', '127.0.0.1:' + sPort, '-c', sFilePHPINI, '-t', path.join(sSistemaPasta, '/app/'), path.join(sSistemaPasta, '/app/router.php')], { cwd: process.env.HOME, env: process.env });

    miServidorProcess.on('error', (err) => {
        console.error(milang.traduzir('Erro ao iniciar o servidor:'), err);
    });

    miServidorProcess.on('close', (code) => {
        console.log(milang.traduzir('O servidor foi encerrado com o código:'), code);
    });

    if (sPlataform == 'linux') {
        const checkPortL = setInterval(() => {
            let lsof = spawn('lsof', ['-ti:' + sPort]);

            lsof.stdout.on('data', (data) => {
                console.log(milang.traduzir('Servidor foi iniciado com sucesso.'));
                sServerName = `http://127.0.0.1:${sPort}/`;
                win.loadURL(sServerName);
                clearInterval(checkPortL);
            });

            lsof.stderr.on('data', (data) => {
                console.error(milang.traduzir('Erro ao executar lsof:'), data);
            });

            lsof.on('close', (code) => {
                if (code !== 0) {
                    console.error(milang.traduzir('lsof saiu com código de erro'), code);
                }
            });
        }, 1000);
    } else if (sPlataform == 'win32') {
        const checkPortW = setInterval(() => {
            let netstat = spawn('netstat', ['-ano']);
            let findstr = spawn('findstr', [':' + sPort]);

            netstat.stdout.on('data', (data) => {
                findstr.stdin.write(data);
            });

            netstat.stderr.on('data', (data) => {
                console.error(milang.traduzir('Erro ao executar netstat:'), data);
            });

            netstat.on('close', (code) => {
                if (code !== 0) {
                    console.error(milang.traduzir('netstat saiu com código de erro'), code);
                }
                findstr.stdin.end();
            });

            findstr.stdout.on('data', (data) => {
                console.log(milang.traduzir('Servidor PHP iniciado com sucesso.'));
                sServerName = `http://127.0.0.1:${sPort}/`;
                win.loadURL(sServerName);
                clearInterval(checkPortW);
            });
        }, 1000);
    }

    miServidorProcess.unref(); // Permite que o aplicativo seja fechado sem fechar o processo do servidor
}

// Nova Janela
function miappsNewWindow(url, width, height, resizable, frame, hide) {
    let sWidth = (width) ? width : config.app.largura;
    let sHeight = (height) ? height : config.app.altura;
    let sResizable = (resizable == true || resizable == false) ? resizable : config.app.redimensionar;
    let sFrame = (frame == true || frame == false) ? frame : config.app.quadro;
    let sHide = (hide == true || hide == false) ? hide : false;

    const sNewWindow = new BrowserWindow({
        width: sWidth,
        height: sHeight,
        resizable: sResizable,
        frame: sFrame,
        icon: path.join(sSistemaPasta, '/app/icon/', config.app.icon),
        webPreferences: {
            preload: path.join(app.getAppPath(), '/preload.js'),
        }
    });

    if (sHide) {
        sNewWindow.hide();
    }

    sNewWindow.setMenu(null);

    if (sStartApp) {
        startMIServidor(sNewWindow);

        app.on("browser-window-created", (e, sNewWindow) => {
            sNewWindow.removeMenu();
        });

        const mifunctions = require(path.join(app.getAppPath(), '/mifunctions.js'));
        mifunctions.mifunctions(sNewWindow, milang, miappsNewWindow);

        ipcMain.handle('appSair', async (event) => {
            app.quit();
        });

        sStartApp = false;
    } else {
        sNewWindow.loadURL(`${sServerName}/${url.replace(sServerName, '')}`);
    }

    createMenuContext(sNewWindow);

    sNewWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url !== '') {
            miappsNewWindow(`${url}`);

            return { action: 'deny' }
        }

        return { action: 'allow' }
    });

    sNewWindow.webContents.on('did-finish-load', () => {
        const miappsFooterText = milang.traduzir('<div class="miapps-info"><a href="javascript:miapps.abrirURL(\\\'https://www.mestredainfo.com.br/2024/07/miapps.html\\\');">%s criado com miapps</a></div>', config.app.nome);
        sNewWindow.webContents.executeJavaScript(`
        const miappsStyleElement = document.createElement('style');
        miappsStyleElement.textContent = 'body{min-height:87vh;position:relative}.miapps-info{font-size:14px;font-weight:bold;font-family:sans-serif,"Courier New";text-align:right;position:absolute;padding-bottom:7px;bottom:-57px;width:100%}.miapps-info>a{text-decoration:none}';
        document.head.appendChild(miappsStyleElement);
            const miappsFooter = document.createElement('div');
            miappsFooter.innerHTML='${miappsFooterText}';
            document.body.appendChild(miappsFooter);
            `);
    });
}

function createMenuContext(win) {
    const contextMenu = new Menu();
    contextMenu.append(new MenuItem({
        label: milang.traduzir('Recortar'),
        role: 'cut'
    }));
    contextMenu.append(new MenuItem({
        label: milang.traduzir('Copiar'),
        role: 'copy'
    }));
    contextMenu.append(new MenuItem({
        label: milang.traduzir('Colar'),
        role: 'paste'
    }));
    contextMenu.append(new MenuItem({
        type: "separator"
    }));
    contextMenu.append(new MenuItem({
        label: milang.traduzir('Selecionar Tudo'),
        role: 'selectall'
    }));

    win.webContents.on('context-menu', (event, params) => {
        if (params.formControlType == 'input-text' || params.formControlType == 'text-area') {
            contextMenu.popup({
                window: win,
                x: params.x,
                y: params.y
            });
        }
    });
}

// Função para encerrar o processo com base na porta
function killProcessByPort(port) {
    let miServidorClose;
    if (sPlataform == 'linux') {
        miServidorClose = spawn('lsof', ['-ti:' + port, '|', 'xargs', 'kill'], { shell: true });

        miServidorClose.stderr.on('data', (data) => {
            console.log(milang.traduzir('Erro ao encerrar o processo na porta:'), sPort);
            return;
        });

        miServidorClose.on('error', (err) => {
            console.error(milang.traduzir('Erro ao encerrar o processo na porta:'), port, err.message);
            return;
        });

        miServidorClose.on('close', (code) => {
            console.log(milang.traduzir('O servidor foi encerrado com o código:'), code);
            return;
        });

        console.log(milang.traduzir('Processo na porta'), port, milang.traduzir('encerrado com sucesso.'));
    }
}

function stopMIServidor() {
    if (miServidorProcess) {
        killProcessByPort(sPort); // Encerra todos os processos do servidor que estão sob a mesma porta
        console.log(milang.traduzir('Servidor parado.'));
    }
}

app.whenReady().then(() => {
    createWindow()

    // Enquanto os aplicativos do Linux são encerrados quando não há janelas abertas, os aplicativos do macOS geralmente continuam em execução mesmo sem nenhuma janela aberta, e ativar o aplicativo quando não há janelas disponíveis deve abrir um novo.
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    });
});

// Para sair do aplicativo no Linux
// Se for MACOS não roda esse comando
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        stopMIServidor();
        app.quit();
    }
});

app.on('before-quit', () => {
    stopMIServidor();
});
