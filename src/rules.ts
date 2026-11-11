import {readFile} from 'node:fs/promises';
import {Otari} from './otari.js';
import {constants} from '../rules/constants.js';
import type {Facts,Result,Stage} from './types.js';
export async function python(g:Otari,file:string,payload:unknown,stage:Stage):Promise<Result<any>>{
 try{
  const source=await readFile(new URL('../../python/'+file,import.meta.url),'utf8').catch(()=>readFile('python/'+file,'utf8'));
  // JSON is embedded as an escaped string, never interpolated into executable source.
  const code=source.replace("if __name__=='__main__':print(json.dumps(run(json.load(sys.stdin))))",'')+'\nprint(json.dumps(run(json.loads('+JSON.stringify(JSON.stringify(payload))+'))))';
  const result=await g.execute({code,language:'python',stage});if(!result.ok)return result;
  if(result.data.return_code!==0)return {ok:false,error:'Sandbox could not complete the calculation.',stage};
  return {ok:true,data:JSON.parse(result.data.stdout)};
 }catch{return {ok:false,error:'Calculation output was unavailable or invalid.',stage};}
}
export function rules(g:Otari,facts:Facts){return python(g,'rules.py',{facts,constants},'rules');}
