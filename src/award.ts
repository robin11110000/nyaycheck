import {python} from './rules.js';
import type {Otari} from './otari.js';
import type {Order} from './types.js';
export function award(g:Otari,orders:Order[],claim:number|null){return python(g,'award.py',{orders,claim},'award');}
