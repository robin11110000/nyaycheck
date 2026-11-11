import {readFileSync} from 'node:fs';
try{for(const line of readFileSync('.env','utf8').split(/\r?\n/)){const m=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);if(!m||process.env[m[1]]!==undefined)continue;let value=m[2];if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);process.env[m[1]]=value;}}catch{}
