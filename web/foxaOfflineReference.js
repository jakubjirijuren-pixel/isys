// FOXA FIELD: per-user offline reference snapshots. Never store passwords or tokens here.
// Snapshots are only used after an existing authenticated session has been restored.
const prefix="foxa-field-reference-v1:";
export function readOfflineReference(userId){
 if(!userId)return null;
 try{const value=JSON.parse(localStorage.getItem(prefix+userId)||"null");return value?.userId===userId?value:null}catch{return null}
}
export function saveOfflineReference(userId,patch){
 if(!userId)return false;
 try{const previous=readOfflineReference(userId)||{userId};
  localStorage.setItem(prefix+userId,JSON.stringify({...previous,...patch,userId,savedAt:new Date().toISOString()}));return true;
 }catch{return false}
}
export function clearOfflineReference(userId){if(userId)try{localStorage.removeItem(prefix+userId)}catch{}}
