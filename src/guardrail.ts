export const unsafe=/(?:you\s+will\s+win|guaranteed|certain\s+to\s+get|definitely)/i;
export function screen(s:string){return !unsafe.test(s);}
export function clean(s:string):string{return s.split(/(?<=[.!?])\s+|\n/).filter(s=>screen(s)).join(' ');}
