// Copyright (C) 2004-2024 Murilo Gomes Julio
// SPDX-License-Identifier: GPL-2.0-only

// Mestre da Info
// Site: https://www.mestredainfo.com.br

module.exports = class milang {
    constructor(platform, dirapp) {
        const fs = require('fs');
        const path = require('path');

        let aLang = '';

        if (platform == 'linux') {
            aLang = (process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || process.env.LC_MESSAGES).split('.')[0].split('_')[0];
        } else {
            const { execFileSync } = require('child_process');
            aLang = String(execFileSync('powershell.exe', ['(Get-WinUserLanguageList)[0].LanguageTag'], { encoding: 'utf-8' })).trim().split('-')[0];
        }

        process.env.MIAPPS_LANG = aLang;

        if (fs.existsSync(path.join(dirapp, '/app/langs/en.json'))) {
            process.env.MIAPPS_LANG = aLang;

            // Idioma do App
            let sPath = path.join(dirapp, '/app/langs/', `${aLang}.json`);

            if (fs.existsSync(sPath)) {
                this.sLangApp = JSON.parse(fs.readFileSync(sPath), 'utf-8');
            } else {
                if (fs.existsSync(path.join(dirapp, '/app/langs/en.json'))) {
                    this.sLangApp = JSON.parse(fs.readFileSync(path.join(dirapp, '/app/langs/en.json'), 'utf-8'));
                } else {
                    this.sLangApp = [];
                }
            }
        } else {
            this.sLangApp = [];
        }
    }
    
    traduzir(texto, ...values) {
        return (this.sLangApp[texto]) ? require('util').format(this.sLangApp[texto], ...values) : require('util').format(texto, ...values);
    }
}