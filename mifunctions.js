// Copyright (C) 2004-2024 Murilo Gomes Julio
// SPDX-License-Identifier: GPL-2.0-only

// Mestre da Info
// Site: https://www.mestredainfo.com.br

const { ipcMain, dialog, BrowserWindow } = require('electron')

module.exports = {
    mifunctions: function (win, milang, miappsNewWindow) {
        // Functions
        // Função para selecionar pasta
        ipcMain.handle('appSelecionarDiretorio', async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] });
            if (!canceled) {
                return filePaths[0];
            }
        });

        // Função para abrir arquivo
        ipcMain.handle('appAbrirArquivo', async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openFile'] });
            if (!canceled) {
                return filePaths[0];
            }
        });

        // Função para salvar arquivo
        ipcMain.handle('appSalvarArquivo', async () => {
            const { canceled, filePath } = await dialog.showSaveDialog({});
            if (!canceled) {
                return filePath;
            }
        });

        // Abrir aplicativo externo
        ipcMain.handle('appExterno', async (event, url) => {
            require('electron').shell.openExternal(url);
        });

        // Obter versão do aplicativo e recursos
        ipcMain.handle('appVersao', async (event, tipo) => {
            if (tipo == 'misistema') {
                return require('electron').app.getVersion();
            } else if (tipo == 'electron') {
                return process.versions.electron;
            } else if (tipo == 'node') {
                return process.versions.node;
            } else if (tipo == 'chromium') {
                return process.versions.chrome;
            } else {
                return '';
            }
        });

        // Função para caixa de alerta
        ipcMain.handle('appMessage', async (event, title, msg, type) => {
            let sButtons = [milang.traduzir('Continuar')];

            let options = {
                type: type,
                buttons: sButtons,
                defaultId: 1,
                cancelId: 2,
                title: title,
                message: msg
            }
            return dialog.showMessageBoxSync(null, options);
        });

        // Função para caixa de confirmação
        ipcMain.handle('appConfirm', async (event, title, msg, type, ...buttons) => {
            let sButtons = [milang.traduzir('Continuar'), milang.traduzir('Cancelar'), ...buttons];

            let options = {
                type: type,
                buttons: sButtons,
                defaultId: 1,
                cancelId: 2,
                title: title,
                message: msg
            }
            return dialog.showMessageBoxSync(null, options);
        });

        // Abre uma nova janela personalizada
        ipcMain.handle('appNewWindow', async (event, url, width, height, resizable, frame, menu, hide) => {
            miappsNewWindow(url, width, height, resizable, frame, menu, hide);
        });

        // Traduzir
        ipcMain.handle('appTraduzir', async (event, text, ...values) => {
            return milang.traduzir(text, ...values);
        });

        // DevTools
        ipcMain.handle('appDevTools', async (event) => {
            BrowserWindow.getFocusedWindow().webContents.appDevTools();
        });

        // Notification
        ipcMain.handle('appNotification', async (event, title, text) => {
            let { Notification } = require('electron');
            new Notification({ title: title, body: text }).show();
        });

        // Tray
        ipcMain.handle('appTray', async (event, title, tooltip, image, menus) => {
            const { Tray, Menu, nativeImage } = require('electron');
            const icon = nativeImage.createFromPath(image);
            let tray = new Tray(icon);

            let template = [];

            let menuData = JSON.parse(menus);

            Object.keys(menuData).forEach((key) => {
                template.push({
                    label: milang.traduzir(key),
                    type: menuData[key].type,
                    click: () => {
                        win.webContents.executeJavaScript(menuData[key].click);
                    }
                });
            });

            const contextMenu = Menu.buildFromTemplate(template);
            tray.setContextMenu(contextMenu);
            tray.setToolTip(tooltip);
            tray.setTitle(title);
        });

        // ExportPDF
        ipcMain.handle('appExportPDF', async (event, filename, options) => {
            const fs = require('fs');
            const pdfPath = filename;

            let pdfOptions = options;
            if (!pdfOptions) {
                pdfOptions = {
                    pageSize: 'A4'
                };
            }

            BrowserWindow.getFocusedWindow().webContents.printToPDF(pdfOptions).then(data => {
                fs.writeFile(pdfPath, data, (error) => {
                    if (error) throw error
                    console.log(milang.traduzir('PDF salvo com sucesso em %s', pdfPath))
                })
            }).catch(error => {
                console.log(milang.traduzir('Erro ao tentar gerar o PDF em %s', pdfPath), error)
            })
        });
    }
}