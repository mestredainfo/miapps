// Copyright (C) 2004-2024 Murilo Gomes Julio
// SPDX-License-Identifier: GPL-2.0-only

// Mestre da Info
// Site: https://www.mestredainfo.com.br

module.exports = class miupdate {
    constructor(milang) {
        this.sMILang = milang
    }

    async getNewVersion() {
        try {
            const https = require('https');

            return new Promise((resolve, reject) => {
                const options = {
                    hostname: 'www.mestredainfo.com.br',
                    path: '/2024/07/miapps.html',
                    method: 'GET'
                };

                const req = https.request(options, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        const match = data.match(/<span id="appversion">([^<]+)<\/span>/);

                        if (match) {
                            const versaonova = match[1].trim();
                            resolve(versaonova);
                            req.destroy();
                            return;
                        } else {
                            data += chunk;
                        }
                    });
                });

                req.on('error', (error) => {
                    reject(new Error(this.sMILang.traduzir('Erro ao fazer a solicitação HTTP: %s', error.message)));
                });

                req.end();
            });
        } catch (error) {
            console.error(this.sMILang.traduzir('Erro ao buscar os dados:'), error);
        }
    }

    checkUpdate(checkmsg) {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const versaoatual = require('electron').app.getVersion().trim();
        const dataatual = new Date();
        const sDataAtual = `${dataatual.getFullYear().toString().padStart(4, '0')}-${(dataatual.getMonth() + 1).toString().padStart(2, '0')}-${dataatual.getDate().toString().padStart(2, '0')}`
        const dirname = path.join(os.userInfo().homedir, '/.miapps/update/');
        const filename = path.join(dirname, '/newversion.txt');
        const fnCheckDate = path.join(dirname, '/checkdate.txt');

        if (!fs.existsSync(filename)) {
            if (!fs.existsSync(dirname)) {
                fs.mkdir(dirname,
                    (err) => {
                        if (err) {
                            return console.error(err);
                        }
                    });
            }

            fs.writeFileSync(filename, versaoatual);
        }

        if (!fs.existsSync(fnCheckDate)) {
            fs.writeFileSync(fnCheckDate, '');
        }

        const sVersaoNova = fs.readFileSync(filename).toString().trim();

        if (sVersaoNova > versaoatual && !checkmsg) {
            const options = {
                type: 'question',
                buttons: [this.sMILang.traduzir('Mais tarde'), this.sMILang.traduzir('Atualizar Agora')],
                title: this.sMILang.traduzir('Atualização do MIApps'),
                message: this.sMILang.traduzir('Deseja baixar a nova versão do MIApps?\nA versão %s já está disponível para baixar.', sVersaoNova)
            };

            console.log(this.sMILang.traduzir('Nova versão do MIApps disponível para baixar.'));

            require('electron').dialog.showMessageBox(null, options).then(retorno => {
                if (retorno.response === 1) {
                    require('electron').shell.openExternal('https://www.mestredainfo.com.br/2024/07/miapps.html');
                }
            });
        } else {
            const fncdDate = fs.readFileSync(fnCheckDate).toString().trim();

            if (sDataAtual != fncdDate || checkmsg) {
                console.log(this.sMILang.traduzir('Verificando uma nova versão do MIApps...'));
                this.getNewVersion()
                    .then((versaonova) => {
                        if (versaonova > versaoatual) {
                            const options = {
                                type: 'question',
                                buttons: [this.sMILang.traduzir('Mais tarde'), this.sMILang.traduzir('Atualizar Agora')],
                                title: this.sMILang.traduzir('Atualização do MIApps'),
                                message: this.sMILang.traduzir('Deseja baixar a nova versão do MIApps?\nA nova versão já está disponível para baixar.')
                            };

                            fs.writeFileSync(filename, versaonova);

                            require('electron').dialog.showMessageBox(null, options).then(retorno => {
                                if (retorno.response === 1) {
                                    require('electron').shell.openExternal('https://www.mestredainfo.com.br/2024/07/miapps.html');
                                }
                            });
                        } else {
                            if (checkmsg) {
                                const options = {
                                    type: 'info',
                                    buttons: [this.sMILang.traduzir('Continuar')],
                                    title: this.sMILang.traduzir('Atualização do MIApps'),
                                    message: this.sMILang.traduzir('O MIApps já está na versão mais recente!')
                                };

                                fs.writeFileSync(filename, versaoatual);
            
                                require('electron').dialog.showMessageBox(null, options);
                            }
                        }
                    })
                    .catch((error) => {
                        console.error(this.sMILang.traduzir('Erro ao buscar os dados:'), error);
                    });

                fs.writeFileSync(fnCheckDate, sDataAtual);
            } else {
                console.log(this.sMILang.traduzir('Verificação de Atualização: O MIApps já está na versão mais recente!'));
            }
        }
    }
}