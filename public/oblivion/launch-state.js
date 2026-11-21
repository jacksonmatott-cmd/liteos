export function launchAvailability({authorized,busy,loading,started,failed,ready,hasExe,hasRoot,memoryError,headless,issue,coreStarted}){
 if(!authorized)return {enabled:false,label:'Start game',hint:'Sign in to an allowed LiteOS profile to start.'};
 if(failed)return {enabled:false,label:'Start game',hint:'The runtime stopped. Reload the experiment to retry.'};
 if(busy)return {enabled:false,label:started?'Loading game…':'Preparing…',hint:started?'Importing your selected game files…':'Checking files and preparing the engine…'};
 if(loading)return {enabled:false,label:'Loading engine…',hint:'Preparing the Wine system files…'};
 if(started)return {enabled:false,label:'Start requested',hint:issue||(coreStarted?'Wine is running. See the game display below.':'Starting Wine…')};
 if(!hasExe)return {enabled:false,label:'Start game',hint:'Choose the installed game folder first.'};
 if(memoryError)return {enabled:false,label:'Start game',hint:memoryError};
 if(!ready&&!hasRoot)return {enabled:false,label:'Start game',hint:'Choose the Wine system ZIP in Runtime setup below.'};
 return {enabled:true,label:headless&&ready?'Start dependency test':'Start game',hint:ready?'Engine prepared. Start is ready.':'Start game will prepare the engine, then launch your EXE.'};
}
